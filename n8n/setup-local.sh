#!/usr/bin/env bash
# Loads the workflows into the local n8n container and publishes them.
# Run from the repo root after `npx supabase start` and `docker compose up -d`.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows would rewrite the container paths

n8n() { docker compose exec -T n8n n8n "$@"; }

# SMTP credential pointing at the Mailpit inbox that `supabase start` runs (http://localhost:54324).
n8n import:credentials --input=/credentials/local-smtp.json
n8n import:workflow --separate --input=/workflows

# Every workflow must be published, including the error handler, or n8n will not call it.
for id in tdInboundMsg0001 tdApprovedRep01 tdShopifySync01 tdBacklogSweep1 tdErrorHandler01; do
  n8n publish:workflow --id="$id"
done

# Published changes take effect on restart.
docker compose restart n8n
echo "n8n ready at http://localhost:5678"
