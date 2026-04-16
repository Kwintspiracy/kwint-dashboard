# Schema fixture — MIRROR

`schema.sql` in this directory is a **mirror** of the canonical fixture in
the runner repo:

    Kwint-Agent-One/tests/smoke/fixtures/schema.sql

It's duplicated here because GitHub Actions in the dashboard repo can't
check out a private repo (Kwint-Agent-One) with the default `GITHUB_TOKEN`.
Using a PAT secret would cross-cut the trust boundary; mirroring the fixture
keeps both CIs self-contained.

## When prod schema changes

Regenerate the file in **both places** and commit to both repos:

```bash
cd dashboard
supabase db dump --schema public --linked \
  -f ../AgentOne/tests/smoke/fixtures/schema.sql

# Then mirror it over:
cp ../AgentOne/tests/smoke/fixtures/schema.sql ./e2e/fixtures/schema.sql
```

Keep them byte-identical. A drift between the two means AgentOne smoke
and Dashboard e2e may disagree about what "production schema" looks like
— exactly the class of bug this whole harness exists to prevent.
