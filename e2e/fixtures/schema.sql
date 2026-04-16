


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auth_user_entity_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT COALESCE(array_agg(entity_id), ARRAY[]::uuid[])
    FROM entity_members
    WHERE user_id = auth.uid()
  $$;


ALTER FUNCTION "public"."auth_user_entity_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count int;
  v_window_start timestamptz;
BEGIN
  -- Try to get existing record
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- First request from this key
    INSERT INTO rate_limits (key, count, window_start) VALUES (p_key, 1, now());
    RETURN true;
  END IF;

  -- Check if window has elapsed
  IF now() - v_window_start > (p_window_seconds || ' seconds')::interval THEN
    -- Reset window
    UPDATE rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN true;
  END IF;

  -- Within window — check limit
  IF v_count >= p_max THEN
    RETURN false;
  END IF;

  -- Increment
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_job"("p_job_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE agent_jobs
  SET status = 'processing', updated_at = now()
  WHERE id = p_job_id
    AND status IN ('pending', 'processing', 'awaiting_delegation')
  ;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;


ALTER FUNCTION "public"."claim_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_connector_key"("p_slug" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_key text;
  v_passphrase text := 'kwint-agent-encrypt-2026';
BEGIN
  SELECT api_key INTO v_key FROM connectors WHERE slug = p_slug AND active = true LIMIT 1;
  IF v_key IS NULL THEN RETURN NULL; END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(decode(v_key, 'base64'), v_passphrase);
  EXCEPTION WHEN OTHERS THEN
    RETURN v_key;  -- Legacy plaintext fallback
  END;
END;
$$;


ALTER FUNCTION "public"."decrypt_connector_key"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_connector_key"("p_slug" "text", "p_passphrase" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_key text;
  v_decrypted text;
BEGIN
  SELECT api_key INTO v_key FROM connectors WHERE slug = p_slug AND active = true LIMIT 1;
  IF v_key IS NULL THEN RETURN NULL; END IF;
  
  -- Try to decrypt; if it fails (legacy plaintext key), return as-is
  BEGIN
    v_decrypted := pgp_sym_decrypt(decode(v_key, 'base64'), p_passphrase);
    RETURN v_decrypted;
  EXCEPTION WHEN OTHERS THEN
    RETURN v_key;  -- Legacy plaintext fallback
  END;
END;
$$;


ALTER FUNCTION "public"."decrypt_connector_key"("p_slug" "text", "p_passphrase" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_api_key_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_passphrase text := 'kwint-agent-encrypt-2026';
BEGIN
  -- Only encrypt if api_key changed and is not already encrypted (base64 pgp format)
  IF NEW.api_key IS NOT NULL AND NEW.api_key != '' THEN
    -- Try to decrypt — if it succeeds, it's already encrypted
    BEGIN
      PERFORM pgp_sym_decrypt(decode(NEW.api_key, 'base64'), v_passphrase);
      -- Already encrypted, leave as-is
    EXCEPTION WHEN OTHERS THEN
      -- Not encrypted yet, encrypt it
      NEW.api_key := encode(pgp_sym_encrypt(NEW.api_key, v_passphrase), 'base64');
    END;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."encrypt_api_key_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_connector_key"("p_connector_id" "uuid", "p_api_key" "text", "p_passphrase" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE connectors
  SET api_key = encode(pgp_sym_encrypt(p_api_key, p_passphrase), 'base64'),
      updated_at = now()
  WHERE id = p_connector_id;
END;
$$;


ALTER FUNCTION "public"."encrypt_connector_key"("p_connector_id" "uuid", "p_api_key" "text", "p_passphrase" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_average_duration"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(ROUND(AVG(duration_ms))::integer, 0)
  FROM agent_runs WHERE duration_ms IS NOT NULL;
$$;


ALTER FUNCTION "public"."get_average_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_average_duration"("p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(ROUND(AVG(duration_ms))::integer, 0)
  FROM agent_runs
  WHERE duration_ms IS NOT NULL
    AND (p_entity_id IS NULL OR entity_id = p_entity_id);
$$;


ALTER FUNCTION "public"."get_average_duration"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_channel_breakdown"() RETURNS TABLE("name" "text", "value" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT channel AS name, COUNT(*) AS value
  FROM agent_jobs WHERE channel IS NOT NULL
  GROUP BY channel ORDER BY value DESC;
$$;


ALTER FUNCTION "public"."get_channel_breakdown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_channel_breakdown"("p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("name" "text", "value" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT channel AS name, COUNT(*) AS value
  FROM agent_jobs
  WHERE channel IS NOT NULL
    AND (p_entity_id IS NULL OR entity_id = p_entity_id)
  GROUP BY channel ORDER BY value DESC;
$$;


ALTER FUNCTION "public"."get_channel_breakdown"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_connector_for_oauth_callback"("p_connector_id" "uuid", "p_entity_id" "uuid") RETURNS TABLE("id" "uuid", "slug" "text", "oauth_token_url" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id, slug, oauth_token_url
  FROM connectors
  WHERE id = p_connector_id AND entity_id = p_entity_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_connector_for_oauth_callback"("p_connector_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid") RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(tokens_used), 0)
  FROM agent_runs
  WHERE agent_id = p_agent_id
    AND created_at >= date_trunc('day', now());
$$;


ALTER FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(tokens_used), 0)
  FROM agent_runs
  WHERE agent_id = p_agent_id
    AND created_at >= date_trunc('day', now())
    AND (p_entity_id IS NULL OR entity_id = p_entity_id);
$$;


ALTER FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entity_by_mcp_token"("p_token" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT id FROM entities WHERE mcp_token = p_token LIMIT 1;
$$;


ALTER FUNCTION "public"."get_entity_by_mcp_token"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_job_counts"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing')
  ) FROM agent_jobs;
$$;


ALTER FUNCTION "public"."get_job_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_job_counts"("p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing')
  ) FROM agent_jobs
  WHERE (p_entity_id IS NULL OR entity_id = p_entity_id);
$$;


ALTER FUNCTION "public"."get_job_counts"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid") RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(tokens_used), 0)
  FROM agent_runs
  WHERE agent_id = p_agent_id
    AND created_at >= date_trunc('month', now());
$$;


ALTER FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(tokens_used), 0)
  FROM agent_runs
  WHERE agent_id = p_agent_id
    AND created_at >= date_trunc('month', now())
    AND (p_entity_id IS NULL OR entity_id = p_entity_id);
$$;


ALTER FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_success_rate"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT CASE WHEN COUNT(*) = 0 THEN 100
    ELSE ROUND((COUNT(*) FILTER (WHERE success)::numeric / COUNT(*)::numeric) * 100)::integer
  END FROM agent_runs;
$$;


ALTER FUNCTION "public"."get_success_rate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_success_rate"("p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT CASE WHEN COUNT(*) = 0 THEN 100
    ELSE ROUND((COUNT(*) FILTER (WHERE success)::numeric / COUNT(*)::numeric) * 100)::integer
  END FROM agent_runs
  WHERE (p_entity_id IS NULL OR entity_id = p_entity_id);
$$;


ALTER FUNCTION "public"."get_success_rate"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tool_usage"() RETURNS TABLE("name" "text", "count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT tool, COUNT(*) AS count
  FROM agent_runs, LATERAL unnest(tools_used) AS tool
  WHERE tools_used IS NOT NULL
  GROUP BY tool ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_tool_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tool_usage"("p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("name" "text", "count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT tool, COUNT(*) AS count
  FROM agent_runs, LATERAL unnest(tools_used) AS tool
  WHERE tools_used IS NOT NULL
    AND (p_entity_id IS NULL OR agent_runs.entity_id = p_entity_id)
  GROUP BY tool ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_tool_usage"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_tokens"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(tokens_used), 0),
    'input_total', COALESCE(SUM(input_tokens), 0),
    'output_total', COALESCE(SUM(output_tokens), 0)
  ) FROM agent_runs;
$$;


ALTER FUNCTION "public"."get_total_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_tokens"("p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(tokens_used), 0),
    'input_total', COALESCE(SUM(input_tokens), 0),
    'output_total', COALESCE(SUM(output_tokens), 0)
  ) FROM agent_runs
  WHERE (p_entity_id IS NULL OR entity_id = p_entity_id);
$$;


ALTER FUNCTION "public"."get_total_tokens"("p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer DEFAULT 10, "similarity_threshold" double precision DEFAULT 0.5, "p_agent_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "fact" "text", "category" "text", "importance" integer, "agent_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.fact,
    m.category,
    m.importance,
    m.agent_id,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM agent_memory m
  WHERE m.embedding IS NOT NULL
    AND (p_agent_id IS NULL OR m.agent_id = p_agent_id OR m.agent_id IS NULL)
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer DEFAULT 10, "similarity_threshold" double precision DEFAULT 0.5, "p_agent_id" "uuid" DEFAULT NULL::"uuid", "p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "fact" "text", "category" "text", "importance" integer, "agent_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.fact, m.category, m.importance, m.agent_id,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM agent_memory m
  WHERE m.embedding IS NOT NULL
    AND (p_agent_id IS NULL OR m.agent_id = p_agent_id OR m.agent_id IS NULL)
    AND (p_entity_id IS NULL OR m.entity_id = p_entity_id)
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mcp_create_task"("p_entity_id" "uuid", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT 'medium'::"text") RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "priority" "text", "status" "text", "result" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_orchestrator_id uuid;
BEGIN
  -- Find first active orchestrator for the entity (optional)
  SELECT a.id INTO v_orchestrator_id
  FROM agents a
  WHERE a.entity_id = p_entity_id AND a.active = true AND a.role = 'orchestrator'
  ORDER BY a.created_at
  LIMIT 1;

  RETURN QUERY
  INSERT INTO agent_tasks(entity_id, orchestrator_id, title, description, priority, status)
  VALUES (p_entity_id, v_orchestrator_id, trim(p_title), trim(p_description), p_priority, 'todo')
  RETURNING id, title, description, priority, status, result, created_at;
END;
$$;


ALTER FUNCTION "public"."mcp_create_task"("p_entity_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mcp_list_tasks"("p_entity_id" "uuid", "p_status" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "priority" "text", "status" "text", "result" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT id, title, description, priority::text, status::text, result, created_at
  FROM agent_tasks
  WHERE entity_id = p_entity_id
    AND (p_status IS NULL OR status::text = p_status)
    AND (p_priority IS NULL OR priority::text = p_priority)
  ORDER BY created_at DESC
  LIMIT LEAST(p_limit, 200);
$$;


ALTER FUNCTION "public"."mcp_list_tasks"("p_entity_id" "uuid", "p_status" "text", "p_priority" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mcp_update_task"("p_entity_id" "uuid", "p_task_id" "uuid", "p_status" "text" DEFAULT NULL::"text", "p_result" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "priority" "text", "status" "text", "result" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  UPDATE agent_tasks
  SET
    status = COALESCE(p_status, agent_tasks.status),
    result = COALESCE(p_result, agent_tasks.result),
    updated_at = now()
  WHERE agent_tasks.id = p_task_id AND agent_tasks.entity_id = p_entity_id
  RETURNING agent_tasks.id, agent_tasks.title, agent_tasks.description,
            agent_tasks.priority, agent_tasks.status,
            agent_tasks.result, agent_tasks.created_at;
END;
$$;


ALTER FUNCTION "public"."mcp_update_task"("p_entity_id" "uuid", "p_task_id" "uuid", "p_status" "text", "p_result" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_orchestrator_role_if_empty"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if not exists (
    select 1 from agent_assignments where orchestrator_id = OLD.orchestrator_id
  ) then
    update agents set role = 'agent'
    where id = OLD.orchestrator_id and role = 'orchestrator';
  end if;
  return OLD;
end;
$$;


ALTER FUNCTION "public"."revert_orchestrator_role_if_empty"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_oauth_tokens"("p_connector_id" "uuid", "p_entity_id" "uuid", "p_access_token" "text", "p_refresh_token" "text" DEFAULT NULL::"text", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_token_url" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE connectors SET
    auth_type             = 'oauth2',
    oauth_access_token    = p_access_token,
    oauth_refresh_token   = p_refresh_token,
    oauth_token_expires_at = p_expires_at,
    oauth_token_url       = COALESCE(p_token_url, oauth_token_url),
    oauth_account_name    = p_account_name
  WHERE id = p_connector_id AND entity_id = p_entity_id;
$$;


ALTER FUNCTION "public"."store_oauth_tokens"("p_connector_id" "uuid", "p_entity_id" "uuid", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_token_url" "text", "p_account_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_orchestrator_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update agents
  set role = 'orchestrator'
  where id = NEW.orchestrator_id;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."sync_orchestrator_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_task_status_from_job"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE agent_tasks SET status = 'done' WHERE job_id = NEW.id AND status = 'in_progress';
  ELSIF NEW.status = 'failed' OR NEW.status = 'cancelled' THEN
    UPDATE agent_tasks SET status = 'cancelled' WHERE job_id = NEW.id AND status = 'in_progress';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_task_status_from_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_memories"("memory_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE agent_memory
  SET last_accessed_at = now(),
      access_count = access_count + 1
  WHERE id = ANY(memory_ids);
$$;


ALTER FUNCTION "public"."touch_memories"("memory_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_agent_tasks"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_agent_tasks"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agent_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "orchestrator_id" "uuid" NOT NULL,
    "sub_agent_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instructions" "text"
);


ALTER TABLE "public"."agent_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "daily_token_limit" bigint DEFAULT 0,
    "monthly_token_limit" bigint DEFAULT 0,
    "alert_threshold_pct" integer DEFAULT 80,
    "auto_pause" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid",
    "max_job_tokens" integer DEFAULT 150000,
    CONSTRAINT "agent_budgets_alert_threshold_pct_check" CHECK ((("alert_threshold_pct" >= 0) AND ("alert_threshold_pct" <= 100)))
);


ALTER TABLE "public"."agent_budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "channel" "text" NOT NULL,
    "task" "text" NOT NULL,
    "chat_id" "text",
    "system_prompt" "text",
    "messages" "jsonb" DEFAULT '[]'::"jsonb",
    "tools_used" "text"[] DEFAULT '{}'::"text"[],
    "turn" integer DEFAULT 0,
    "result" "text",
    "error" "text",
    "chain_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "agent_id" "uuid",
    "request_id" "text",
    "parent_job_id" "uuid",
    "total_duration_ms" integer DEFAULT 0,
    "entity_id" "uuid",
    "pending_delegation" "jsonb",
    "parent_request_id" "text",
    "original_task" "text",
    "input_tokens" integer DEFAULT 0,
    "output_tokens" integer DEFAULT 0,
    "delegation_depth" integer DEFAULT 0,
    CONSTRAINT "agent_jobs_channel_check" CHECK (("channel" = ANY (ARRAY['telegram'::"text", 'api'::"text", 'whatsapp'::"text", 'internal'::"text", 'cron'::"text", 'task-board'::"text", 'slack'::"text", 'discord'::"text"]))),
    CONSTRAINT "agent_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'awaiting_approval'::"text", 'awaiting_delegation'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."agent_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_mcp_servers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "mcp_server_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "enabled_tools" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_mcp_servers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fact" "text" NOT NULL,
    "category" "text" DEFAULT 'context'::"text",
    "importance" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "agent_id" "uuid",
    "embedding" "extensions"."vector"(1536),
    "entity_id" "uuid",
    "source" "text" DEFAULT 'agent'::"text",
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "access_count" integer DEFAULT 0,
    "archived" boolean DEFAULT false,
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_to" timestamp with time zone,
    "fact_hash" "text",
    "skill_tags" "text"[] DEFAULT '{}'::"text"[],
    "memory_layer" "text",
    CONSTRAINT "agent_memory_category_check" CHECK (("category" = ANY (ARRAY['preference'::"text", 'context'::"text", 'outcome'::"text", 'learned_rule'::"text"]))),
    CONSTRAINT "agent_memory_importance_check" CHECK ((("importance" >= 1) AND ("importance" <= 5))),
    CONSTRAINT "agent_memory_source_check" CHECK (("source" = ANY (ARRAY['agent'::"text", 'reflection'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."agent_memory" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agent_memory"."source" IS 'How this memory was created: agent (save_memory tool), reflection (auto-learned post-task), manual (dashboard)';



CREATE TABLE IF NOT EXISTS "public"."agent_plugins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "plugin_type" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "active" boolean DEFAULT true,
    "hook" "text" NOT NULL,
    "webhook_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_plugins_hook_check" CHECK (("hook" = ANY (ARRAY['pre_task'::"text", 'post_task'::"text", 'pre_tool'::"text", 'post_tool'::"text", 'on_memory_save'::"text"]))),
    CONSTRAINT "agent_plugins_plugin_type_check" CHECK (("plugin_type" = ANY (ARRAY['webhook'::"text", 'transform'::"text", 'schedule'::"text"])))
);


ALTER TABLE "public"."agent_plugins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task" "text" NOT NULL,
    "result" "text",
    "success" boolean DEFAULT true,
    "tools_used" "text"[] DEFAULT '{}'::"text"[],
    "tokens_used" integer,
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "agent_id" "uuid",
    "input_tokens" integer,
    "output_tokens" integer,
    "entity_id" "uuid",
    "key_source" "text",
    CONSTRAINT "agent_runs_key_source_check" CHECK (("key_source" = ANY (ARRAY['entity'::"text", 'operator'::"text"])))
);


ALTER TABLE "public"."agent_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'cron'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "cron_expr" "text" NOT NULL,
    "task" "text",
    "objectives" "text",
    "active" boolean DEFAULT true,
    "last_run" timestamp with time zone,
    "next_run" timestamp with time zone,
    "last_status" "text",
    "chat_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid",
    CONSTRAINT "agent_schedules_last_status_check" CHECK (("last_status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'no_action'::"text", NULL::"text"]))),
    CONSTRAINT "agent_schedules_type_check" CHECK (("type" = ANY (ARRAY['cron'::"text", 'heartbeat'::"text"])))
);


ALTER TABLE "public"."agent_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_skill_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approval_overrides" "jsonb" DEFAULT '{}'::"jsonb",
    "use_custom_instructions" boolean DEFAULT false NOT NULL,
    "enabled_operations" "text"[]
);


ALTER TABLE "public"."agent_skill_assignments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agent_skill_assignments"."use_custom_instructions" IS 'When true, this skill uses the markdown skill document (MD path) instead of typed adapter tools. Useful for highly customised skills.';



COMMENT ON COLUMN "public"."agent_skill_assignments"."enabled_operations" IS 'Subset of skill operations enabled for this agent. NULL = all enabled. Empty array = none.';



CREATE TABLE IF NOT EXISTS "public"."agent_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "content" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid",
    "description" "text",
    "default_content" "text",
    "content_overridden" boolean DEFAULT false,
    "required_config" "jsonb" DEFAULT '[]'::"jsonb",
    "operations" "jsonb" DEFAULT '[]'::"jsonb",
    "required_builtins" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."agent_skills" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agent_skills"."required_builtins" IS 'Built-in tools this skill needs (e.g. http_request for API proxies). Auto-checked on assignment.';



CREATE TABLE IF NOT EXISTS "public"."agent_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "orchestrator_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "job_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "result" "text",
    "created_by_agent_id" "uuid",
    "assigned_agent_id" "uuid",
    "input_tokens" integer DEFAULT 0,
    "output_tokens" integer DEFAULT 0,
    "cost_usd" numeric(10,6) DEFAULT 0,
    "depends_on" "uuid"[] DEFAULT '{}'::"uuid"[],
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "root_job_id" "uuid",
    "locked_at" timestamp with time zone,
    "locked_by" "text",
    CONSTRAINT "agent_tasks_description_check" CHECK (("char_length"("description") <= 2000)),
    CONSTRAINT "agent_tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "agent_tasks_status_check" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'done'::"text", 'cancelled'::"text", 'blocked'::"text"]))),
    CONSTRAINT "agent_tasks_title_check" CHECK (("char_length"("title") <= 200))
);


ALTER TABLE "public"."agent_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "personality" "text" NOT NULL,
    "model" "text" DEFAULT 'claude-sonnet-4-6-20260217'::"text",
    "active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "telegram_bot_token" "text",
    "telegram_bot_username" "text",
    "role" "text" DEFAULT 'agent'::"text",
    "telegram_webhook_secret" "text",
    "requires_approval" "text"[] DEFAULT '{}'::"text"[],
    "capabilities" "text"[] DEFAULT '{}'::"text"[],
    "entity_id" "uuid",
    "telegram_webhook_url" "text",
    "task_context_template" "text",
    "avatar_url" "text",
    "system_agent" boolean DEFAULT false,
    "max_tokens_per_job" integer DEFAULT 0 NOT NULL,
    "enabled_builtin_tools" "text"[],
    "orchestrator_mode" "text",
    CONSTRAINT "agents_max_tokens_per_job_check" CHECK (("max_tokens_per_job" >= 0)),
    CONSTRAINT "agents_orchestrator_mode_check" CHECK (("orchestrator_mode" = ANY (ARRAY['router'::"text", 'planner'::"text"]))),
    CONSTRAINT "agents_role_check" CHECK (("role" = ANY (ARRAY['agent'::"text", 'orchestrator'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agents"."max_tokens_per_job" IS 'Per-job cumulative input+output token cap. 0 = unlimited.';



COMMENT ON COLUMN "public"."agents"."enabled_builtin_tools" IS 'Built-in tool names the agent can call. NULL = all (legacy). [] = none. return_result implicit.';



COMMENT ON COLUMN "public"."agents"."orchestrator_mode" IS 'Explicit mode for role=orchestrator agents. router = assign_* tools to sub-agents. planner = task board tools. NULL = legacy inference (has sub-orchestrators => router, else planner).';



CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "tool_name" "text" NOT NULL,
    "tool_input" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    "notes" "text",
    "entity_id" "uuid",
    CONSTRAINT "approval_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "tool_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "condition_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid",
    CONSTRAINT "approval_rules_action_check" CHECK (("action" = ANY (ARRAY['auto_approve'::"text", 'require_approval'::"text", 'block'::"text"])))
);


ALTER TABLE "public"."approval_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configurator_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "turn_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."configurator_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connectors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "base_url" "text",
    "api_key" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid",
    "auth_type" "text" DEFAULT 'api_key'::"text" NOT NULL,
    "oauth_client_id" "text",
    "oauth_client_secret" "text",
    "oauth_refresh_token" "text",
    "oauth_access_token" "text",
    "oauth_token_expires_at" timestamp with time zone,
    "oauth_token_url" "text",
    "oauth_scopes" "text",
    "oauth_account_name" "text",
    CONSTRAINT "connectors_auth_type_check" CHECK (("auth_type" = ANY (ARRAY['api_key'::"text", 'oauth2'::"text", 'bearer'::"text", 'basic'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."connectors" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."connectors_safe" AS
 SELECT "id",
    "name",
    "slug",
    "base_url",
    "auth_type",
    "oauth_scopes",
    "oauth_account_name",
    (("oauth_access_token" IS NOT NULL) OR ("oauth_refresh_token" IS NOT NULL)) AS "has_oauth_token",
    (("api_key" IS NOT NULL) OR ("oauth_client_secret" IS NOT NULL) OR ("oauth_refresh_token" IS NOT NULL) OR ("oauth_access_token" IS NOT NULL)) AS "has_key",
    "active",
    "created_at",
    "entity_id"
   FROM "public"."connectors";


ALTER VIEW "public"."connectors_safe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text" DEFAULT '🏢'::"text",
    "industry" "text",
    "goal" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "mcp_token" "uuid" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."entities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_llm_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "api_key" "text" DEFAULT ''::"text" NOT NULL,
    "base_url" "text",
    "nickname" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_llm_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "entity_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."entity_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcp_servers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "transport" "text" NOT NULL,
    "url" "text",
    "command" "text",
    "args" "text"[] DEFAULT '{}'::"text"[],
    "env_vars" "jsonb" DEFAULT '{}'::"jsonb",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "available_tools" "jsonb",
    CONSTRAINT "mcp_servers_transport_check" CHECK (("transport" = ANY (ARRAY['http'::"text", 'stdio'::"text"])))
);


ALTER TABLE "public"."mcp_servers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "key" "text" NOT NULL,
    "count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."session_summary" AS
SELECT
    NULL::"uuid" AS "session_id",
    NULL::"uuid" AS "entity_id",
    NULL::"text" AS "task",
    NULL::"text" AS "original_task",
    NULL::"text" AS "channel",
    NULL::"uuid" AS "agent_id",
    NULL::"text" AS "chat_id",
    NULL::"text" AS "root_status",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "completed_at",
    NULL::"text" AS "result",
    NULL::"text" AS "error",
    NULL::integer AS "child_count",
    NULL::bigint AS "total_input_tokens",
    NULL::bigint AS "total_output_tokens",
    NULL::bigint AS "total_duration_ms",
    NULL::"text" AS "session_status",
    NULL::"uuid"[] AS "child_agent_ids";


ALTER VIEW "public"."session_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_connectors" (
    "skill_id" "uuid" NOT NULL,
    "connector_id" "uuid" NOT NULL,
    "entity_id" "uuid"
);


ALTER TABLE "public"."skill_connectors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "skill_id" "uuid",
    "version" integer NOT NULL,
    "content" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid"
);


ALTER TABLE "public"."skill_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "tool_name" "text" NOT NULL,
    "tool_input" "jsonb",
    "tool_output" "text",
    "duration_ms" integer,
    "turn" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid"
);


ALTER TABLE "public"."tool_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_triggers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "agent_id" "uuid",
    "task_template" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "secret" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text"),
    "last_triggered_at" timestamp with time zone,
    "trigger_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entity_id" "uuid"
);


ALTER TABLE "public"."webhook_triggers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_orchestrator_id_sub_agent_id_key" UNIQUE ("orchestrator_id", "sub_agent_id");



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_budgets"
    ADD CONSTRAINT "agent_budgets_agent_id_key" UNIQUE ("agent_id");



ALTER TABLE ONLY "public"."agent_budgets"
    ADD CONSTRAINT "agent_budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_mcp_servers"
    ADD CONSTRAINT "agent_mcp_servers_agent_id_mcp_server_id_key" UNIQUE ("agent_id", "mcp_server_id");



ALTER TABLE ONLY "public"."agent_mcp_servers"
    ADD CONSTRAINT "agent_mcp_servers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_memory"
    ADD CONSTRAINT "agent_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_plugins"
    ADD CONSTRAINT "agent_plugins_entity_id_slug_key" UNIQUE ("entity_id", "slug");



ALTER TABLE ONLY "public"."agent_plugins"
    ADD CONSTRAINT "agent_plugins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_schedules"
    ADD CONSTRAINT "agent_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_skill_assignments"
    ADD CONSTRAINT "agent_skill_assignments_agent_id_skill_id_key" UNIQUE ("agent_id", "skill_id");



ALTER TABLE ONLY "public"."agent_skill_assignments"
    ADD CONSTRAINT "agent_skill_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."agent_tasks"
    ADD CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_rules"
    ADD CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configurator_sessions"
    ADD CONSTRAINT "configurator_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connectors"
    ADD CONSTRAINT "connectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connectors"
    ADD CONSTRAINT "connectors_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."entity_llm_keys"
    ADD CONSTRAINT "entity_llm_keys_entity_id_provider_key" UNIQUE ("entity_id", "provider");



ALTER TABLE ONLY "public"."entity_llm_keys"
    ADD CONSTRAINT "entity_llm_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_members"
    ADD CONSTRAINT "entity_members_entity_id_user_id_key" UNIQUE ("entity_id", "user_id");



ALTER TABLE ONLY "public"."entity_members"
    ADD CONSTRAINT "entity_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcp_servers"
    ADD CONSTRAINT "mcp_servers_entity_id_slug_key" UNIQUE ("entity_id", "slug");



ALTER TABLE ONLY "public"."mcp_servers"
    ADD CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."skill_connectors"
    ADD CONSTRAINT "skill_connectors_pkey" PRIMARY KEY ("skill_id", "connector_id");



ALTER TABLE ONLY "public"."skill_versions"
    ADD CONSTRAINT "skill_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_calls"
    ADD CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."webhook_triggers"
    ADD CONSTRAINT "webhook_triggers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_triggers"
    ADD CONSTRAINT "webhook_triggers_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "entities_mcp_token_idx" ON "public"."entities" USING "btree" ("mcp_token");



CREATE INDEX "idx_agent_budgets_entity_id" ON "public"."agent_budgets" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_jobs_entity_created" ON "public"."agent_jobs" USING "btree" ("entity_id", "created_at" DESC);



CREATE INDEX "idx_agent_jobs_entity_id" ON "public"."agent_jobs" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_jobs_entity_status_created" ON "public"."agent_jobs" USING "btree" ("entity_id", "status", "created_at" DESC);



CREATE INDEX "idx_agent_jobs_parent_job_id" ON "public"."agent_jobs" USING "btree" ("parent_job_id");



CREATE INDEX "idx_agent_mcp_servers_agent" ON "public"."agent_mcp_servers" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_mcp_servers_entity" ON "public"."agent_mcp_servers" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_memory_archived" ON "public"."agent_memory" USING "btree" ("archived");



CREATE INDEX "idx_agent_memory_embedding" ON "public"."agent_memory" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='10');



CREATE INDEX "idx_agent_memory_entity_active" ON "public"."agent_memory" USING "btree" ("entity_id", "archived", "valid_to") WHERE ("archived" = false);



CREATE INDEX "idx_agent_memory_entity_id" ON "public"."agent_memory" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_memory_fact_hash" ON "public"."agent_memory" USING "btree" ("fact_hash") WHERE ("fact_hash" IS NOT NULL);



CREATE INDEX "idx_agent_memory_last_accessed" ON "public"."agent_memory" USING "btree" ("last_accessed_at");



CREATE INDEX "idx_agent_memory_layer" ON "public"."agent_memory" USING "btree" ("memory_layer");



CREATE INDEX "idx_agent_memory_skill_tags" ON "public"."agent_memory" USING "gin" ("skill_tags");



CREATE INDEX "idx_agent_memory_valid_to" ON "public"."agent_memory" USING "btree" ("valid_to") WHERE (("valid_to" IS NOT NULL) AND ("archived" = false));



CREATE INDEX "idx_agent_runs_agent_created" ON "public"."agent_runs" USING "btree" ("agent_id", "created_at" DESC);



CREATE INDEX "idx_agent_runs_entity_id" ON "public"."agent_runs" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_schedules_entity_id" ON "public"."agent_schedules" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_skills_entity_id" ON "public"."agent_skills" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_tasks_assigned" ON "public"."agent_tasks" USING "btree" ("assigned_agent_id");



CREATE INDEX "idx_agent_tasks_entity" ON "public"."agent_tasks" USING "btree" ("entity_id");



CREATE INDEX "idx_agent_tasks_entity_status_created" ON "public"."agent_tasks" USING "btree" ("entity_id", "status", "created_at" DESC);



CREATE INDEX "idx_agent_tasks_orchestrator_status" ON "public"."agent_tasks" USING "btree" ("orchestrator_id", "status");



CREATE INDEX "idx_agent_tasks_status" ON "public"."agent_tasks" USING "btree" ("status");



CREATE INDEX "idx_agents_entity_id" ON "public"."agents" USING "btree" ("entity_id");



CREATE UNIQUE INDEX "idx_agents_one_default_per_entity" ON "public"."agents" USING "btree" ("entity_id") WHERE ("is_default" = true);



CREATE INDEX "idx_approval_requests_entity_id" ON "public"."approval_requests" USING "btree" ("entity_id");



CREATE INDEX "idx_approval_rules_entity_id" ON "public"."approval_rules" USING "btree" ("entity_id");



CREATE INDEX "idx_approval_status" ON "public"."approval_requests" USING "btree" ("status", "requested_at");



CREATE INDEX "idx_configurator_sessions_agent" ON "public"."configurator_sessions" USING "btree" ("agent_id");



CREATE INDEX "idx_configurator_sessions_entity" ON "public"."configurator_sessions" USING "btree" ("entity_id");



CREATE INDEX "idx_connectors_entity_id" ON "public"."connectors" USING "btree" ("entity_id");



CREATE INDEX "idx_entities_user_id" ON "public"."entities" USING "btree" ("user_id");



CREATE INDEX "idx_entity_members_entity_id" ON "public"."entity_members" USING "btree" ("entity_id");



CREATE INDEX "idx_entity_members_user" ON "public"."entity_members" USING "btree" ("user_id", "entity_id");



CREATE INDEX "idx_entity_members_user_id" ON "public"."entity_members" USING "btree" ("user_id");



CREATE INDEX "idx_jobs_parent" ON "public"."agent_jobs" USING "btree" ("parent_job_id");



CREATE INDEX "idx_jobs_status" ON "public"."agent_jobs" USING "btree" ("status", "created_at");



CREATE INDEX "idx_memory_category" ON "public"."agent_memory" USING "btree" ("category", "importance" DESC);



CREATE INDEX "idx_runs_agent" ON "public"."agent_runs" USING "btree" ("agent_id", "created_at" DESC);



CREATE INDEX "idx_runs_recent" ON "public"."agent_runs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_schedules_active" ON "public"."agent_schedules" USING "btree" ("active", "next_run");



CREATE INDEX "idx_skill_connectors_entity_id" ON "public"."skill_connectors" USING "btree" ("entity_id");



CREATE INDEX "idx_skill_versions_entity_id" ON "public"."skill_versions" USING "btree" ("entity_id");



CREATE INDEX "idx_skill_versions_skill_id" ON "public"."skill_versions" USING "btree" ("skill_id", "version" DESC);



CREATE INDEX "idx_skills_active" ON "public"."agent_skills" USING "btree" ("active", "slug");



CREATE INDEX "idx_tool_calls_entity_id" ON "public"."tool_calls" USING "btree" ("entity_id");



CREATE INDEX "idx_tool_calls_job" ON "public"."tool_calls" USING "btree" ("job_id");



CREATE INDEX "idx_tool_calls_job_created" ON "public"."tool_calls" USING "btree" ("job_id", "created_at" DESC);



CREATE INDEX "idx_tool_calls_recent" ON "public"."tool_calls" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_webhook_triggers_entity_id" ON "public"."webhook_triggers" USING "btree" ("entity_id");



CREATE OR REPLACE VIEW "public"."session_summary" AS
 SELECT "root"."id" AS "session_id",
    "root"."entity_id",
    "root"."task",
    "root"."original_task",
    "root"."channel",
    "root"."agent_id",
    "root"."chat_id",
    "root"."status" AS "root_status",
    "root"."created_at",
    "root"."completed_at",
    "root"."result",
    "root"."error",
    ("count"("child"."id"))::integer AS "child_count",
    (COALESCE("sum"("child"."input_tokens"), (0)::bigint) + COALESCE("root"."input_tokens", 0)) AS "total_input_tokens",
    (COALESCE("sum"("child"."output_tokens"), (0)::bigint) + COALESCE("root"."output_tokens", 0)) AS "total_output_tokens",
    (COALESCE("root"."total_duration_ms", 0) + COALESCE("sum"("child"."total_duration_ms"), (0)::bigint)) AS "total_duration_ms",
        CASE
            WHEN (("root"."status" = 'failed'::"text") OR "bool_or"(("child"."status" = 'failed'::"text"))) THEN 'failed'::"text"
            WHEN (("root"."status" = ANY (ARRAY['processing'::"text", 'pending'::"text", 'awaiting_delegation'::"text"])) OR "bool_or"(("child"."status" = ANY (ARRAY['processing'::"text", 'pending'::"text", 'awaiting_delegation'::"text"])))) THEN 'processing'::"text"
            ELSE "root"."status"
        END AS "session_status",
    "array_agg"(DISTINCT "child"."agent_id") FILTER (WHERE ("child"."agent_id" IS NOT NULL)) AS "child_agent_ids"
   FROM ("public"."agent_jobs" "root"
     LEFT JOIN "public"."agent_jobs" "child" ON (("child"."parent_job_id" = "root"."id")))
  WHERE ("root"."parent_job_id" IS NULL)
  GROUP BY "root"."id";



CREATE OR REPLACE TRIGGER "agent_job_status_change" AFTER UPDATE OF "status" ON "public"."agent_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_task_status_from_job"();



CREATE OR REPLACE TRIGGER "set_updated_at_agent_tasks" BEFORE UPDATE ON "public"."agent_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_agent_tasks"();



CREATE OR REPLACE TRIGGER "set_updated_at_entity_llm_keys" BEFORE UPDATE ON "public"."entity_llm_keys" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_user_profiles" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_encrypt_connector_key" BEFORE INSERT OR UPDATE OF "api_key" ON "public"."connectors" FOR EACH ROW EXECUTE FUNCTION "public"."encrypt_api_key_trigger"();



CREATE OR REPLACE TRIGGER "trg_revert_orchestrator_role" AFTER DELETE ON "public"."agent_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."revert_orchestrator_role_if_empty"();



CREATE OR REPLACE TRIGGER "trg_sync_orchestrator_role" AFTER INSERT ON "public"."agent_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_orchestrator_role"();



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_orchestrator_id_fkey" FOREIGN KEY ("orchestrator_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_sub_agent_id_fkey" FOREIGN KEY ("sub_agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_budgets"
    ADD CONSTRAINT "agent_budgets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_budgets"
    ADD CONSTRAINT "agent_budgets_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_jobs"
    ADD CONSTRAINT "agent_jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "public"."agent_jobs"("id");



ALTER TABLE ONLY "public"."agent_mcp_servers"
    ADD CONSTRAINT "agent_mcp_servers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_mcp_servers"
    ADD CONSTRAINT "agent_mcp_servers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_mcp_servers"
    ADD CONSTRAINT "agent_mcp_servers_mcp_server_id_fkey" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_memory"
    ADD CONSTRAINT "agent_memory_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_memory"
    ADD CONSTRAINT "agent_memory_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_plugins"
    ADD CONSTRAINT "agent_plugins_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_schedules"
    ADD CONSTRAINT "agent_schedules_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_schedules"
    ADD CONSTRAINT "agent_schedules_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_skill_assignments"
    ADD CONSTRAINT "agent_skill_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_skill_assignments"
    ADD CONSTRAINT "agent_skill_assignments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_skill_assignments"
    ADD CONSTRAINT "agent_skill_assignments_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."agent_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_tasks"
    ADD CONSTRAINT "agent_tasks_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_tasks"
    ADD CONSTRAINT "agent_tasks_created_by_agent_id_fkey" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_tasks"
    ADD CONSTRAINT "agent_tasks_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_tasks"
    ADD CONSTRAINT "agent_tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_tasks"
    ADD CONSTRAINT "agent_tasks_orchestrator_id_fkey" FOREIGN KEY ("orchestrator_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_rules"
    ADD CONSTRAINT "approval_rules_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_rules"
    ADD CONSTRAINT "approval_rules_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."configurator_sessions"
    ADD CONSTRAINT "configurator_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."configurator_sessions"
    ADD CONSTRAINT "configurator_sessions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connectors"
    ADD CONSTRAINT "connectors_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_llm_keys"
    ADD CONSTRAINT "entity_llm_keys_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_members"
    ADD CONSTRAINT "entity_members_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_members"
    ADD CONSTRAINT "entity_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcp_servers"
    ADD CONSTRAINT "mcp_servers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_connectors"
    ADD CONSTRAINT "skill_connectors_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_connectors"
    ADD CONSTRAINT "skill_connectors_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_connectors"
    ADD CONSTRAINT "skill_connectors_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."agent_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_versions"
    ADD CONSTRAINT "skill_versions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_versions"
    ADD CONSTRAINT "skill_versions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."agent_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_calls"
    ADD CONSTRAINT "tool_calls_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_calls"
    ADD CONSTRAINT "tool_calls_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_triggers"
    ADD CONSTRAINT "webhook_triggers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_triggers"
    ADD CONSTRAINT "webhook_triggers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;



CREATE POLICY "Entity members only" ON "public"."agent_budgets" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Entity members only" ON "public"."agent_jobs" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."agent_memory" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."agent_plugins" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Entity members only" ON "public"."agent_runs" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."agent_schedules" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."agent_skills" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."agents" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."approval_requests" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."approval_rules" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Entity members only" ON "public"."connectors" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."mcp_servers" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Entity members only" ON "public"."skill_connectors" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Entity members only" ON "public"."skill_versions" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Entity members only" ON "public"."tool_calls" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "Entity members only" ON "public"."webhook_triggers" USING (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entities"."id"
   FROM "public"."entities"
  WHERE ("entities"."user_id" = "auth"."uid"()))));



CREATE POLICY "Service role full access" ON "public"."agent_budgets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agent_jobs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agent_memory" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agent_plugins" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agent_runs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agent_schedules" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agent_skills" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."agents" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."approval_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."approval_rules" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."connectors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."entities" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."entity_members" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."mcp_servers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."rate_limits" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."skill_connectors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."skill_versions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."tool_calls" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."webhook_triggers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users see own entities" ON "public"."entities" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users see own memberships" ON "public"."entity_members" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."agent_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_mcp_servers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_mcp_servers_entity_select" ON "public"."agent_mcp_servers" FOR SELECT USING (("entity_id" IN ( SELECT "entity_members"."entity_id"
   FROM "public"."entity_members"
  WHERE ("entity_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "agent_mcp_servers_entity_write" ON "public"."agent_mcp_servers" USING (("entity_id" IN ( SELECT "entity_members"."entity_id"
   FROM "public"."entity_members"
  WHERE ("entity_members"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entity_members"."entity_id"
   FROM "public"."entity_members"
  WHERE ("entity_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "agent_mcp_servers_service" ON "public"."agent_mcp_servers" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."agent_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_plugins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_skill_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_tasks_member_access" ON "public"."agent_tasks" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configurator_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "configurator_sessions_entity_select" ON "public"."configurator_sessions" FOR SELECT USING (("entity_id" IN ( SELECT "entity_members"."entity_id"
   FROM "public"."entity_members"
  WHERE ("entity_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "configurator_sessions_entity_write" ON "public"."configurator_sessions" USING (("entity_id" IN ( SELECT "entity_members"."entity_id"
   FROM "public"."entity_members"
  WHERE ("entity_members"."user_id" = "auth"."uid"())))) WITH CHECK (("entity_id" IN ( SELECT "entity_members"."entity_id"
   FROM "public"."entity_members"
  WHERE ("entity_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "configurator_sessions_service" ON "public"."configurator_sessions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."connectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity members full access" ON "public"."agent_assignments" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



CREATE POLICY "entity members full access" ON "public"."agent_skill_assignments" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



ALTER TABLE "public"."entity_llm_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entity_llm_keys_member_access" ON "public"."entity_llm_keys" USING (("entity_id" = ANY ("public"."auth_user_entity_ids"()))) WITH CHECK (("entity_id" = ANY ("public"."auth_user_entity_ids"())));



ALTER TABLE "public"."entity_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcp_servers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_connectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_self_read" ON "public"."user_profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_profiles_self_write" ON "public"."user_profiles" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."webhook_triggers" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_user_entity_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_user_entity_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_user_entity_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_job"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_job"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_job"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_connector_key"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_connector_key"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_connector_key"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_connector_key"("p_slug" "text", "p_passphrase" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_connector_key"("p_slug" "text", "p_passphrase" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_connector_key"("p_slug" "text", "p_passphrase" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_api_key_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_api_key_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_api_key_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_connector_key"("p_connector_id" "uuid", "p_api_key" "text", "p_passphrase" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_connector_key"("p_connector_id" "uuid", "p_api_key" "text", "p_passphrase" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_connector_key"("p_connector_id" "uuid", "p_api_key" "text", "p_passphrase" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_average_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_average_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_average_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_average_duration"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_average_duration"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_average_duration"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_channel_breakdown"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_channel_breakdown"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_channel_breakdown"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_channel_breakdown"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_channel_breakdown"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_channel_breakdown"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_connector_for_oauth_callback"("p_connector_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_connector_for_oauth_callback"("p_connector_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_connector_for_oauth_callback"("p_connector_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_by_mcp_token"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_by_mcp_token"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_by_mcp_token"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_job_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_job_counts"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_counts"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_counts"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_token_usage"("p_agent_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_success_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_success_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_success_rate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_success_rate"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_success_rate"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_success_rate"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tool_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_tool_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tool_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tool_usage"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tool_usage"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tool_usage"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_tokens"("p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_tokens"("p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_tokens"("p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_memories"("query_embedding" "extensions"."vector", "match_count" integer, "similarity_threshold" double precision, "p_agent_id" "uuid", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mcp_create_task"("p_entity_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mcp_create_task"("p_entity_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mcp_create_task"("p_entity_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mcp_list_tasks"("p_entity_id" "uuid", "p_status" "text", "p_priority" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."mcp_list_tasks"("p_entity_id" "uuid", "p_status" "text", "p_priority" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mcp_list_tasks"("p_entity_id" "uuid", "p_status" "text", "p_priority" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."mcp_update_task"("p_entity_id" "uuid", "p_task_id" "uuid", "p_status" "text", "p_result" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mcp_update_task"("p_entity_id" "uuid", "p_task_id" "uuid", "p_status" "text", "p_result" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mcp_update_task"("p_entity_id" "uuid", "p_task_id" "uuid", "p_status" "text", "p_result" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_orchestrator_role_if_empty"() TO "anon";
GRANT ALL ON FUNCTION "public"."revert_orchestrator_role_if_empty"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_orchestrator_role_if_empty"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."store_oauth_tokens"("p_connector_id" "uuid", "p_entity_id" "uuid", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_token_url" "text", "p_account_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_oauth_tokens"("p_connector_id" "uuid", "p_entity_id" "uuid", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_token_url" "text", "p_account_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_oauth_tokens"("p_connector_id" "uuid", "p_entity_id" "uuid", "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_token_url" "text", "p_account_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_orchestrator_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_orchestrator_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_orchestrator_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_task_status_from_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_task_status_from_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_task_status_from_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_memories"("memory_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."touch_memories"("memory_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_memories"("memory_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_agent_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_agent_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_agent_tasks"() TO "service_role";



GRANT ALL ON TABLE "public"."agent_assignments" TO "anon";
GRANT ALL ON TABLE "public"."agent_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."agent_budgets" TO "anon";
GRANT ALL ON TABLE "public"."agent_budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_budgets" TO "service_role";



GRANT ALL ON TABLE "public"."agent_jobs" TO "anon";
GRANT ALL ON TABLE "public"."agent_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."agent_mcp_servers" TO "anon";
GRANT ALL ON TABLE "public"."agent_mcp_servers" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_mcp_servers" TO "service_role";



GRANT ALL ON TABLE "public"."agent_memory" TO "anon";
GRANT ALL ON TABLE "public"."agent_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_memory" TO "service_role";



GRANT ALL ON TABLE "public"."agent_plugins" TO "anon";
GRANT ALL ON TABLE "public"."agent_plugins" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_plugins" TO "service_role";



GRANT ALL ON TABLE "public"."agent_runs" TO "anon";
GRANT ALL ON TABLE "public"."agent_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_runs" TO "service_role";



GRANT ALL ON TABLE "public"."agent_schedules" TO "anon";
GRANT ALL ON TABLE "public"."agent_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."agent_skill_assignments" TO "anon";
GRANT ALL ON TABLE "public"."agent_skill_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_skill_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."agent_skills" TO "anon";
GRANT ALL ON TABLE "public"."agent_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_skills" TO "service_role";



GRANT ALL ON TABLE "public"."agent_tasks" TO "anon";
GRANT ALL ON TABLE "public"."agent_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."approval_rules" TO "anon";
GRANT ALL ON TABLE "public"."approval_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_rules" TO "service_role";



GRANT ALL ON TABLE "public"."configurator_sessions" TO "anon";
GRANT ALL ON TABLE "public"."configurator_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."configurator_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."connectors" TO "anon";
GRANT ALL ON TABLE "public"."connectors" TO "authenticated";
GRANT ALL ON TABLE "public"."connectors" TO "service_role";



GRANT ALL ON TABLE "public"."connectors_safe" TO "anon";
GRANT ALL ON TABLE "public"."connectors_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."connectors_safe" TO "service_role";



GRANT ALL ON TABLE "public"."entities" TO "anon";
GRANT ALL ON TABLE "public"."entities" TO "authenticated";
GRANT ALL ON TABLE "public"."entities" TO "service_role";



GRANT ALL ON TABLE "public"."entity_llm_keys" TO "anon";
GRANT ALL ON TABLE "public"."entity_llm_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_llm_keys" TO "service_role";



GRANT ALL ON TABLE "public"."entity_members" TO "anon";
GRANT ALL ON TABLE "public"."entity_members" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_members" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_servers" TO "anon";
GRANT ALL ON TABLE "public"."mcp_servers" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_servers" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."session_summary" TO "anon";
GRANT ALL ON TABLE "public"."session_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."session_summary" TO "service_role";



GRANT ALL ON TABLE "public"."skill_connectors" TO "anon";
GRANT ALL ON TABLE "public"."skill_connectors" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_connectors" TO "service_role";



GRANT ALL ON TABLE "public"."skill_versions" TO "anon";
GRANT ALL ON TABLE "public"."skill_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_versions" TO "service_role";



GRANT ALL ON TABLE "public"."tool_calls" TO "anon";
GRANT ALL ON TABLE "public"."tool_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_calls" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_triggers" TO "anon";
GRANT ALL ON TABLE "public"."webhook_triggers" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_triggers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







