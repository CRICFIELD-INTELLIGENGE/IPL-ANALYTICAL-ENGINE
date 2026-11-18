#!/usr/bin/env bash
# Adds the read-only Supabase login from env/scout-reader.env (git-ignored) to the Vercel project's Production
# environment, so the live function can load the IPL, Scout and raw-match data from Supabase.
# Values are piped straight to the Vercel CLI and never printed. Re-running replaces them (--force).
#   bash scripts/vercel-add-supabase-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f env/scout-reader.env ] || { echo "env/scout-reader.env not found" >&2; exit 1; }
added=0
while IFS='=' read -r key value || [ -n "$key" ]; do
  key="${key%$'\r'}"; value="${value%$'\r'}"
  [[ "$key" =~ ^PG(HOST|PORT|DATABASE|USER|PASSWORD)$ ]] || continue
  printf '%s' "$value" | npx --yes vercel env add "$key" production --force >/dev/null
  echo "added $key"; added=$((added + 1))
done < env/scout-reader.env
[ "$added" -eq 5 ] || { echo "expected 5 PG* values, added $added" >&2; exit 1; }
echo "Done. The next production deploy uses Supabase."
