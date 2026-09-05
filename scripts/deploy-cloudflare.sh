#!/usr/bin/env bash
#
# Stand up a fresh Cloudflare Pages project for this site, with its KV
# namespaces created and bound, and push a deployment to it.
#
# Everything here is idempotent: re-running it against an existing project
# reuses what is already there instead of erroring.
#
#   Requirements
#     CLOUDFLARE_API_TOKEN   token with: Account → Cloudflare Pages: Edit,
#                            Account → Workers KV Storage: Edit
#     CLOUDFLARE_ACCOUNT_ID  optional; looked up from the token when the token
#                            can see exactly one account
#
#   Usage
#     CLOUDFLARE_API_TOKEN=... ./scripts/deploy-cloudflare.sh
#     PROJECT=some-other-name ./scripts/deploy-cloudflare.sh
#
# Note: this needs egress to api.cloudflare.com. Claude Code's remote sandbox
# blocks that host, so run it locally or from CI.

set -euo pipefail

PROJECT="${PROJECT:-nahia-tours-illustrated}"
PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"
API="https://api.cloudflare.com/client/v4"

# The Functions read DATA_KV_F first and fall back to DATA_KV
# (see functions/api/data.ts), so bind one namespace under both names and
# neither path can miss it.
KV_BINDINGS=(DATA_KV_F DATA_KV)

die() { printf '\nerror: %s\n' "$1" >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

command -v jq  >/dev/null || die "jq is required"
command -v curl >/dev/null || die "curl is required"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "CLOUDFLARE_API_TOKEN is not set"

cf() {
  # cf METHOD PATH [JSON_BODY] — returns the raw envelope, fails loudly.
  local method="$1" path="$2" body="${3:-}" response
  if [ -n "$body" ]; then
    response=$(curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$body")
  else
    response=$(curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
  fi
  printf '%s' "$response"
}

cf_ok() { printf '%s' "$1" | jq -e '.success == true' >/dev/null 2>&1; }
cf_errors() { printf '%s' "$1" | jq -r '[.errors[]? | "\(.code) \(.message)"] | join("; ")'; }

# ── Account ──────────────────────────────────────────────────────────────
step "Resolving account"
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  accounts=$(cf GET "/accounts?per_page=50")
  cf_ok "$accounts" || die "listing accounts failed: $(cf_errors "$accounts")"
  count=$(printf '%s' "$accounts" | jq '.result | length')
  [ "$count" = "1" ] || die "token sees $count accounts — set CLOUDFLARE_ACCOUNT_ID explicitly"
  CLOUDFLARE_ACCOUNT_ID=$(printf '%s' "$accounts" | jq -r '.result[0].id')
fi
export CLOUDFLARE_ACCOUNT_ID
echo "account: $CLOUDFLARE_ACCOUNT_ID"

# ── Pages project ────────────────────────────────────────────────────────
step "Creating Pages project '$PROJECT'"
existing=$(cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT")
if cf_ok "$existing"; then
  echo "already exists — reusing it"
else
  created=$(cf POST "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" \
    "$(jq -nc --arg n "$PROJECT" --arg b "$PRODUCTION_BRANCH" \
        '{name: $n, production_branch: $b}')")
  cf_ok "$created" || die "creating the project failed: $(cf_errors "$created")"
  echo "created"
fi

# ── KV namespaces ────────────────────────────────────────────────────────
# One namespace for production, one for preview deployments, so a preview
# deploy can never write over live data.
find_or_create_kv() {
  local title="$1" list id
  list=$(cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces?per_page=100")
  cf_ok "$list" || die "listing KV namespaces failed: $(cf_errors "$list")"
  id=$(printf '%s' "$list" | jq -r --arg t "$title" '.result[] | select(.title == $t) | .id' | head -1)
  if [ -z "$id" ]; then
    local created
    created=$(cf POST "/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces" \
      "$(jq -nc --arg t "$title" '{title: $t}')")
    cf_ok "$created" || die "creating KV namespace '$title' failed: $(cf_errors "$created")"
    id=$(printf '%s' "$created" | jq -r '.result.id')
  fi
  printf '%s' "$id"
}

step "Creating KV namespaces"
KV_PROD_ID=$(find_or_create_kv "${PROJECT}-data")
KV_PREVIEW_ID=$(find_or_create_kv "${PROJECT}-data-preview")
echo "production: ${PROJECT}-data          $KV_PROD_ID"
echo "preview:    ${PROJECT}-data-preview  $KV_PREVIEW_ID"

# ── Bind them to the project ─────────────────────────────────────────────
step "Binding KV namespaces to the project"
bindings_for() {
  local id="$1" binding out='{}'
  for binding in "${KV_BINDINGS[@]}"; do
    out=$(printf '%s' "$out" | jq -c --arg b "$binding" --arg i "$id" \
      '. + {($b): {namespace_id: $i}}')
  done
  printf '%s' "$out"
}

patch=$(jq -nc \
  --argjson prod "$(bindings_for "$KV_PROD_ID")" \
  --argjson prev "$(bindings_for "$KV_PREVIEW_ID")" \
  '{deployment_configs: {production: {kv_namespaces: $prod},
                         preview:    {kv_namespaces: $prev}}}')

patched=$(cf PATCH "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT" "$patch")
cf_ok "$patched" || die "binding the namespaces failed: $(cf_errors "$patched")"
printf '%s' "$patched" | jq -r '
  .result.deployment_configs
  | to_entries[]
  | "\(.key): " + ((.value.kv_namespaces // {}) | keys | join(", "))'

# ── Build and deploy ─────────────────────────────────────────────────────
step "Building"
npm run build

step "Deploying"
# --commit-dirty keeps the deploy from stalling on the generated sitemap.
npx wrangler pages deploy dist \
  --project-name="$PROJECT" \
  --branch="$PRODUCTION_BRANCH" \
  --commit-dirty=true

step "Done"
cat <<EOF

  project:     $PROJECT
  live URL:    https://${PROJECT}.pages.dev
  KV (prod):   ${PROJECT}-data          $KV_PROD_ID
  KV (preview) ${PROJECT}-data-preview  $KV_PREVIEW_ID
  bound as:    ${KV_BINDINGS[*]}

  The KV namespaces start empty. Seed the live one with:
    curl -X POST https://${PROJECT}.pages.dev/api/init-data \\
      -H "Authorization: Bearer \$INIT_DATA_SECRET"

EOF
