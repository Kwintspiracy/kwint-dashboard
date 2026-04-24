-- Wave 0.5 — Lock down get_entity_by_mcp_token.
--
-- The function is SECURITY DEFINER, so any caller with EXECUTE can trade a
-- token UUID for the owning entity_id without any further auth. Base schema
-- granted it to anon, so the /rest/v1/rpc endpoint was callable by unauth'd
-- clients — a brute-force UUID enumeration channel. The only legitimate
-- caller is the Next.js MCP bridge, which runs server-side and has the
-- service role key.
--
-- Revoke execute from anon + authenticated. service_role retains access (it
-- is owned by postgres and bypasses grants, but we set it explicitly for
-- documentation + to survive any future regrant-all migration).

REVOKE EXECUTE ON FUNCTION public.get_entity_by_mcp_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_entity_by_mcp_token(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_entity_by_mcp_token(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_entity_by_mcp_token(uuid) TO service_role;

COMMENT ON FUNCTION public.get_entity_by_mcp_token(uuid) IS
  'Service-role only. Trades an MCP bearer token for the owning entity_id. '
  'Callable only from the Next.js MCP bridge (api/mcp/tasks) which runs with '
  'SUPABASE_SERVICE_ROLE_KEY. Do NOT grant to anon/authenticated — that re-opens '
  'the tenant enumeration channel fixed in 20260423_mcp_token_scope.sql.';
