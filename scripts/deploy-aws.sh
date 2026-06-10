#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DEPLOY_ENV="$ROOT_DIR/apps/backend/.env.deploy"
FRONTEND_DEPLOY_ENV="$ROOT_DIR/apps/frontend/.env.deploy"
EXTRA_ENV_FILE=""
DEPLOY_BACKEND=1
DEPLOY_FRONTEND=1

# ── Pretty console logging ───────────────────────────────────────────────────
# All log output goes to STDERR so it never pollutes the values that helper
# functions return on STDOUT via $(...). Colours are disabled automatically when
# stderr is not a TTY (CI logs), when NO_COLOR is set, or for dumb terminals.
SCRIPT_START_TS="$(date +%s)"

if [[ -t 2 && -z "${NO_COLOR:-}" && "${TERM:-}" != "dumb" ]]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'; C_CYAN=$'\033[36m'; C_GRAY=$'\033[90m'
else
  C_RESET=''; C_BOLD=''; C_DIM=''
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_CYAN=''; C_GRAY=''
fi

# Console width for full-width boxes. Reads the controlling terminal directly
# (reliable even when stdout is captured in $(...)). Falls back to 72 off-TTY.
_box_width() {
  local w=0
  if [[ -t 2 ]]; then
    w="$(stty size </dev/tty 2>/dev/null | cut -d' ' -f2 || true)"
  fi
  if ! [[ "$w" =~ ^[0-9]+$ ]] || (( w < 24 )); then
    w=72
  fi
  printf '%s' "$w"
}

# Draw a full-width box around ONE OR MORE title lines.
#   $1 = marker glyph (▶ / ✔), $2 = colour escape, $3.. = each remaining arg is
#   one line rendered inside the box.
# NOTE: width is measured with ${#str} (code points). Assumes a UTF-8 locale,
# which every interactive deploy terminal here uses.
log_box() {
  local marker="$1" color="$2"
  shift 2
  local width inner bar line content pad
  width="$(_box_width)"
  inner=$(( width - 2 ))             # interior between the two ║ borders
  printf -v bar '%*s' "$inner" ''
  bar="${bar// /═}"
  {
    printf '\n%s%s╔%s╗%s\n' "$C_BOLD" "$color" "$bar" "$C_RESET"
    for line in "$@"; do
      content=" ${marker}  ${line}"
      pad=$(( inner - ${#content} ))
      if (( pad < 0 )); then pad=0; fi
      printf '%s%s║%s%*s║%s\n' "$C_BOLD" "$color" "$content" "$pad" '' "$C_RESET"
    done
    printf '%s%s╚%s╝%s\n' "$C_BOLD" "$color" "$bar" "$C_RESET"
  } >&2
}

# ▶ blue box for in-progress headers; ✔ green box for the success close.
# Each argument is one line inside the box.
log_section() { log_box "▶" "$C_BLUE" "$@"; }
log_done()    { log_box "✔" "$C_GREEN" "$@"; }

log_step()    { printf '%s▸%s %s%s%s\n' "$C_CYAN" "$C_RESET" "$C_BOLD" "$*" "$C_RESET" >&2; }
log_info()    { printf '  %s%s%s\n'     "$C_GRAY" "$*" "$C_RESET" >&2; }
log_success() { printf '%s✔%s %s\n'     "$C_GREEN" "$C_RESET" "$*" >&2; }
log_warn()    { printf '%s⚠ %s%s\n'     "$C_YELLOW" "$*" "$C_RESET" >&2; }
log_error()   { printf '%s✖ %s%s\n'     "$C_RED" "$*" "$C_RESET" >&2; }

# Pretty human-readable elapsed time, e.g. "1m 09s" or "47s".
fmt_duration() {
  local secs="$1"
  if (( secs >= 60 )); then
    printf '%dm %02ds' "$(( secs / 60 ))" "$(( secs % 60 ))"
  else
    printf '%ds' "$secs"
  fi
}

# Friendly red banner on any UNEXPECTED failure (a command failing under set -e).
# Does NOT fire on the explicit `exit 1` error paths (verified), so handled
# errors stay single-lined.
trap 'log_error "Deploy aborted unexpectedly at line $LINENO (exit $?). See the output above."' ERR

usage() {
  cat <<'USAGE'
Deploy Agrinews to AWS.

Backend:
  Builds apps/backend with apps/docker/backend/Dockerfile.prod, pushes to ECR,
  then updates ECS when ECS_CLUSTER and ECS_SERVICE are set.

Frontend:
  Builds apps/frontend static files and syncs dist/ to S3. CloudFront
  invalidation runs when CLOUDFRONT_DISTRIBUTION_ID is set.

Required for backend:
  BACKEND_ECR_REPOSITORY       ECR repository name, e.g. agrinews-backend

Required for frontend:
  FRONTEND_S3_BUCKET           S3 bucket name for FE static hosting

Common optional:
  apps/backend/.env.deploy       Backend deploy + ECS runtime env (auto-loaded)
  apps/frontend/.env.deploy      Frontend deploy env (auto-loaded)
  --env-file <path>              Optional extra env file loaded before the above
  AWS_PROFILE                    AWS CLI profile name
  AWS_REGION                     AWS region, default ap-northeast-1
  IMAGE_TAG                      Docker image tag, default current git SHA or timestamp

Backend optional (in apps/backend/.env.deploy):
  AWS_ACCOUNT_ID               Auto-detected with STS when unset
  ECS_CLUSTER                  ECS cluster name/ARN
  ECS_SERVICE                  ECS service name
  ECS_TASK_DEFINITION          Task definition family/ARN to clone with the new image
  BACKEND_CONTAINER_NAME       Container name inside task definition, default backend
  BACKEND_RUN_MIGRATIONS       Run migration:run:prod before ECS rollout (default: 1)
  BACKEND_RUN_S3_CHECK         Run an ECS one-off S3 write check before migrations
                               (default: 1; only when STORAGE_PROVIDER=s3)
  BACKEND_RUN_SEED_DEV         Run seed:prod + seed:dev:prod once (default: once).
                               Values: once | always | never. "once" writes an S3 marker
                               to BACKEND_SEED_DEV_S3_BUCKET when set.
  BACKEND_SEED_DEV_S3_BUCKET   S3 bucket for the seed:dev marker object
  BACKEND_SEED_DEV_MARKER_KEY  S3 object key for the seed:dev marker (default:
                               .deploy/<cluster>-backend-seed-dev.done)

Frontend optional (in apps/frontend/.env.deploy):
  VITE_API_BASE_URL            FE API base URL. If unset and CloudFront ID is
                               set, resolved to https://<cloudfront-domain>.
                               Do not append /api — paths already include it.
  VITE_APP_TITLE               FE title, default agrinews
  CLOUDFRONT_DISTRIBUTION_ID   Distribution ID to invalidate after S3 sync

Examples:
  ./scripts/deploy-aws.sh

  ./scripts/deploy-aws.sh --backend-only
  ./scripts/deploy-aws.sh --frontend-only
  ./scripts/deploy-aws.sh --env-file .env.local.override
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-only)
      DEPLOY_FRONTEND=0
      shift
      ;;
    --frontend-only)
      DEPLOY_BACKEND=0
      shift
      ;;
    --env-file)
      if [[ -z "${2:-}" ]]; then
        log_error "--env-file requires a path"
        exit 2
      fi
      EXTRA_ENV_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      usage >&2
      exit 2
      ;;
  esac
done

repo_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    echo "$path"
  else
    echo "$ROOT_DIR/$path"
  fi
}

load_deploy_env() {
  local env_path="$1"
  if [[ -f "$env_path" ]]; then
    log_info "env ← ${env_path#"$ROOT_DIR/"}"
    set -a
    # shellcheck disable=SC1090
    source "$env_path"
    set +a
  fi
}

if [[ -n "$EXTRA_ENV_FILE" ]]; then
  load_deploy_env "$(repo_path "$EXTRA_ENV_FILE")"
fi

if [[ "$DEPLOY_BACKEND" -eq 1 ]]; then
  load_deploy_env "$BACKEND_DEPLOY_ENV"
fi

if [[ "$DEPLOY_FRONTEND" -eq 1 ]]; then
  load_deploy_env "$FRONTEND_DEPLOY_ENV"
fi

AWS_REGION="${AWS_REGION:-ap-northeast-1}"
AWS_PROFILE_OPT=()

if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_PROFILE_OPT=(--profile "$AWS_PROFILE")
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_error "Missing required command: $1"
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    log_error "Missing required environment variable: $name"
    exit 1
  fi
}

# Echo the command (dimmed) then run it. Output goes to stderr so command
# substitution callers are unaffected.
run() {
  printf '%s  ❯ %s%s\n' "$C_GRAY" "$*" "$C_RESET" >&2
  "$@"
}

git_or_timestamp_tag() {
  if git -C "$ROOT_DIR" rev-parse --short HEAD >/dev/null 2>&1; then
    git -C "$ROOT_DIR" rev-parse --short HEAD
  else
    date +%Y%m%d%H%M%S
  fi
}

aws_account_id() {
  if [[ -n "${AWS_ACCOUNT_ID:-}" ]]; then
    echo "$AWS_ACCOUNT_ID"
  else
    aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} sts get-caller-identity --query Account --output text
  fi
}

frontend_api_base_url() {
  if [[ -n "${VITE_API_BASE_URL:-}" ]]; then
    echo "$VITE_API_BASE_URL"
  elif [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
    local domain
    domain="$(
      aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} cloudfront get-distribution \
        --id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --query 'Distribution.DomainName' \
        --output text
    )"
    echo "https://${domain}"
  else
    echo "/"
  fi
}

current_service_task_definition() {
  aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs describe-services \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --query 'services[0].taskDefinition' \
    --output text
}

backend_seed_dev_s3_bucket() {
  if [[ -n "${BACKEND_SEED_DEV_S3_BUCKET:-}" ]]; then
    echo "$BACKEND_SEED_DEV_S3_BUCKET"
  elif [[ -n "${FRONTEND_S3_BUCKET:-}" ]]; then
    echo "$FRONTEND_S3_BUCKET"
  fi
}

backend_seed_dev_marker_key() {
  if [[ -n "${BACKEND_SEED_DEV_MARKER_KEY:-}" ]]; then
    echo "$BACKEND_SEED_DEV_MARKER_KEY"
    return
  fi
  local cluster_slug="${ECS_CLUSTER##*/}"
  cluster_slug="${cluster_slug:-agrinews}"
  echo ".deploy/${cluster_slug}-backend-seed-dev.done"
}

backend_seed_dev_marker_exists() {
  local bucket
  bucket="$(backend_seed_dev_s3_bucket)"
  if [[ -z "$bucket" ]]; then
    return 1
  fi
  local marker_key
  marker_key="$(backend_seed_dev_marker_key)"
  aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} s3api head-object \
    --region "$AWS_REGION" \
    --bucket "$bucket" \
    --key "$marker_key" >/dev/null 2>&1
}

write_backend_seed_dev_marker() {
  local bucket
  bucket="$(backend_seed_dev_s3_bucket)"
  if [[ -z "$bucket" ]]; then
    return 0
  fi
  local marker_key
  marker_key="$(backend_seed_dev_marker_key)"
  local marker_file
  marker_file="$(mktemp)"
  printf 'seed:dev completed at %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$marker_file"
  run aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} s3 cp \
    "$marker_file" \
    "s3://${bucket}/${marker_key}" \
    --region "$AWS_REGION" \
    --content-type "text/plain"
  rm -f "$marker_file"
}

should_run_backend_seed_dev() {
  case "${BACKEND_RUN_SEED_DEV:-once}" in
    never|0|false)
      return 1
      ;;
    always|1|true)
      return 0
      ;;
    once)
      if backend_seed_dev_marker_exists; then
        return 1
      fi
      return 0
      ;;
    *)
      echo "Invalid BACKEND_RUN_SEED_DEV: ${BACKEND_RUN_SEED_DEV} (use once, always, or never)" >&2
      exit 1
      ;;
  esac
}

register_backend_task_definition() {
  local image_uri="$1"

  require_cmd jq

  local container_name task_definition task_json task_input_json backend_env new_task_arn
  container_name="${BACKEND_CONTAINER_NAME:-backend}"
  task_definition="${ECS_TASK_DEFINITION:-$(current_service_task_definition)}"
  task_json="$(mktemp)"
  task_input_json="$(mktemp)"
  backend_env="$(backend_env_json)"

  aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs describe-task-definition \
    --region "$AWS_REGION" \
    --task-definition "$task_definition" \
    --query taskDefinition > "$task_json"

  jq --arg image "$image_uri" --arg name "$container_name" --argjson env "$backend_env" '
    .containerDefinitions |= map(
      if .name == $name then
        ((.secrets // []) | map(.name)) as $secretNames
        | .image = $image
        | .environment = (
            (
              ((.environment // []) | map(select(.name as $n | ($env | map(.name) | index($n) | not))))
              + $env
            )
            | map(select(.name as $n | ($secretNames | index($n) | not)))
          )
      else
        .
      end
    )
    | del(
        .taskDefinitionArn,
        .revision,
        .status,
        .requiresAttributes,
        .compatibilities,
        .registeredAt,
        .registeredBy
      )
  ' "$task_json" > "$task_input_json"

  jq -e . "$task_input_json" >/dev/null

  new_task_arn="$(
    aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs register-task-definition \
      --region "$AWS_REGION" \
      --cli-input-json "file://$task_input_json" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text
  )"
  rm -f "$task_json" "$task_input_json"

  log_success "Registered task definition: ${new_task_arn##*task-definition/}"
  echo "$new_task_arn"
}

run_backend_ecs_command() {
  local task_definition="$1"
  shift

  require_cmd jq

  local container_name service_json network_config launch_type
  local capacity_strategy task_arn exit_code stopped_reason overrides run_task_args=()

  container_name="${BACKEND_CONTAINER_NAME:-backend}"

  service_json="$(
    aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs describe-services \
      --region "$AWS_REGION" \
      --cluster "$ECS_CLUSTER" \
      --services "$ECS_SERVICE" \
      --output json
  )"

  network_config="$(echo "$service_json" | jq -c '.services[0].networkConfiguration // empty')"
  if [[ -z "$network_config" || "$network_config" == "null" ]]; then
    log_error "ECS service has no awsvpc networkConfiguration; cannot run one-off task."
    exit 1
  fi

  launch_type="$(echo "$service_json" | jq -r '.services[0].launchType // empty')"
  capacity_strategy="$(echo "$service_json" | jq -c '.services[0].capacityProviderStrategy // empty')"

  # ECS run-task only allows command/env overrides — not image. The task
  # definition passed in must already reference the new image URI.
  overrides="$(
    jq -n \
      --arg name "$container_name" \
      --argjson command "$(printf '%s\n' "$@" | jq -R . | jq -s .)" \
      '{containerOverrides: [{name: $name, command: $command}]}'
  )"

  run_task_args=(
    ecs run-task
    --region "$AWS_REGION"
    --cluster "$ECS_CLUSTER"
    --task-definition "$task_definition"
    --overrides "$overrides"
    --network-configuration "$network_config"
    --started-by "deploy-aws.sh"
  )

  if [[ -n "$capacity_strategy" && "$capacity_strategy" != "null" && "$capacity_strategy" != "[]" ]]; then
    run_task_args+=(--capacity-provider-strategy "$capacity_strategy")
  elif [[ "$launch_type" == "FARGATE" || "$launch_type" == "EC2" ]]; then
    run_task_args+=(--launch-type "$launch_type")
  else
    run_task_args+=(--launch-type FARGATE)
  fi

  log_step "ECS one-off task: ${*}"
  task_arn="$(
    aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} "${run_task_args[@]}" \
      --query 'tasks[0].taskArn' \
      --output text
  )"

  if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
    log_error "ECS run-task did not return a task ARN."
    exit 1
  fi

  log_info "waiting for task ${task_arn##*/} ..."
  aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs wait tasks-stopped \
    --region "$AWS_REGION" \
    --cluster "$ECS_CLUSTER" \
    --tasks "$task_arn"

  exit_code="$(
    aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs describe-tasks \
      --region "$AWS_REGION" \
      --cluster "$ECS_CLUSTER" \
      --tasks "$task_arn" \
      --query "tasks[0].containers[?name=='${container_name}'] | [0].exitCode" \
      --output text
  )"
  stopped_reason="$(
    aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs describe-tasks \
      --region "$AWS_REGION" \
      --cluster "$ECS_CLUSTER" \
      --tasks "$task_arn" \
      --query "tasks[0].containers[?name=='${container_name}'] | [0].reason" \
      --output text
  )"

  if [[ "$exit_code" != "0" ]]; then
    log_error "ECS one-off task failed (exit=${exit_code}, reason=${stopped_reason})."
    log_info "Check CloudWatch logs for task: $task_arn"
    exit 1
  fi

  log_success "ECS one-off task succeeded: ${task_arn##*/}"
}

run_backend_db_tasks() {
  local task_definition="$1"

  if [[ "${BACKEND_RUN_MIGRATIONS:-1}" == "1" || "${BACKEND_RUN_MIGRATIONS}" == "true" ]]; then
    log_step "Running database migrations (migration:run:prod)"
    run_backend_ecs_command "$task_definition" \
      npm run migration:run:prod
  fi
}

# Keys from apps/backend/.env.deploy that are deploy-script only — never injected
# into the ECS container as plaintext environment variables.
DEPLOY_MANAGED_KEYS_DEFAULT="AWS_REGION AWS_PROFILE AWS_ACCOUNT_ID IMAGE_TAG BACKEND_ECR_REPOSITORY ECS_CLUSTER ECS_SERVICE ECS_TASK_DEFINITION BACKEND_CONTAINER_NAME BACKEND_ENV_FILE BACKEND_RUN_MIGRATIONS BACKEND_RUN_SEED_DEV BACKEND_SEED_DEV_MARKER_KEY BACKEND_SEED_DEV_S3_BUCKET FRONTEND_S3_BUCKET CLOUDFRONT_DISTRIBUTION_ID VITE_API_BASE_URL VITE_APP_TITLE"

# Keys whose values are managed by AWS Secrets Manager via the task
# definition "secrets" block. These are NEVER injected as plaintext
# environment variables from .env.deploy — Secrets Manager is the single
# source of truth for them. Override / extend with the SECRET_MANAGED_KEYS
# env var (space-separated) when the secret set changes.
#
# The deploy also auto-excludes any key already present in the existing
# task definition's .secrets block (see the jq filter in deploy_backend),
# so this list is the belt-and-suspenders for keys that live under a
# differently-named secret (e.g. REDIS_PASSWORD ↔ REDIS_AUTH_TOKEN) or
# are placeholders in .env.deploy.
SECRET_MANAGED_KEYS_DEFAULT="DB_PASSWORD DB_USERNAME REDIS_PASSWORD REDIS_AUTH_TOKEN SESSION_SECRET STORAGE_ACCESS_KEY STORAGE_SECRET_KEY MAIL_USER MAIL_PASS"

backend_env_json() {
  local env_file="${BACKEND_ENV_FILE:-$ROOT_DIR/apps/backend/.env.deploy}"
  env_file="$(repo_path "$env_file")"
  if [[ ! -f "$env_file" ]]; then
    echo "[]"
    return
  fi

  require_cmd python3
  SECRET_MANAGED_KEYS="${SECRET_MANAGED_KEYS:-$SECRET_MANAGED_KEYS_DEFAULT}" \
  DEPLOY_MANAGED_KEYS="${DEPLOY_MANAGED_KEYS:-$DEPLOY_MANAGED_KEYS_DEFAULT}" \
  python3 - "$env_file" <<'PY'
import json
import os
import re
import sys

env_path = sys.argv[1]
secret_keys = {k for k in os.environ.get("SECRET_MANAGED_KEYS", "").split() if k}
deploy_keys = {k for k in os.environ.get("DEPLOY_MANAGED_KEYS", "").split() if k}
items = []
seen = set()

with open(env_path, encoding="utf-8") as env_file:
    for raw_line in env_file:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].strip()
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key):
            raise SystemExit(f"Invalid env key in {env_path}: {key}")

        if key in secret_keys or key in deploy_keys:
            continue

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in ("'", '"')
        ):
            value = value[1:-1]

        if key in seen:
            items = [item for item in items if item["name"] != key]
        seen.add(key)
        items.append({"name": key, "value": value})

print(json.dumps(items, separators=(",", ":")))
PY
}

deploy_backend() {
  require_cmd aws
  require_cmd docker
  require_env BACKEND_ECR_REPOSITORY

  local deploy_env_label account_id registry image_tag image_uri latest_uri
  deploy_env_label="${NODE_ENV:-dev}"
  log_section \
    "Agrinews AWS deploy · backend · region ${AWS_REGION}" \
    "BACKEND · deploy → ${deploy_env_label}"

  account_id="$(aws_account_id)"
  registry="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  image_tag="${IMAGE_TAG:-$(git_or_timestamp_tag)}"
  image_uri="${registry}/${BACKEND_ECR_REPOSITORY}:${image_tag}"
  latest_uri="${registry}/${BACKEND_ECR_REPOSITORY}:latest"
  log_info "region    ${AWS_REGION}"
  log_info "registry  ${registry}"
  log_info "image tag ${image_tag}"

  log_step "ECR login + image build/push"

  aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecr describe-repositories \
    --region "$AWS_REGION" \
    --repository-names "$BACKEND_ECR_REPOSITORY" >/dev/null 2>&1 || \
    run aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecr create-repository \
      --region "$AWS_REGION" \
      --repository-name "$BACKEND_ECR_REPOSITORY" >/dev/null

  aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$registry"

  run docker build \
    -f "$ROOT_DIR/apps/docker/backend/Dockerfile.prod" \
    -t "$image_uri" \
    -t "$latest_uri" \
    "$ROOT_DIR/apps/backend"

  run docker push "$image_uri"
  run docker push "$latest_uri"

  if [[ -n "${ECS_CLUSTER:-}" && -n "${ECS_SERVICE:-}" ]]; then
    local new_task_arn
    log_step "ECS rollout → ${ECS_SERVICE}"
    new_task_arn="$(register_backend_task_definition "$image_uri")"

    # if [[ "${BACKEND_RUN_MIGRATIONS:-1}" == "1" || "${BACKEND_RUN_MIGRATIONS}" == "true" ]] \
    #   || should_run_backend_seed_dev; then
    #   run_backend_db_tasks "$new_task_arn"
    # fi

    run aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} ecs update-service \
      --region "$AWS_REGION" \
      --cluster "$ECS_CLUSTER" \
      --service "$ECS_SERVICE" \
      --task-definition "$new_task_arn" >/dev/null
    log_success "ECS service updated to ${new_task_arn##*task-definition/}"
  else
    log_warn "ECS_CLUSTER / ECS_SERVICE unset — image pushed but no rollout."
  fi

  log_success "Backend image pushed: ${image_uri}"
  log_success "BACKEND deploy (${deploy_env_label}) done"
}

deploy_frontend() {
  require_cmd aws
  require_cmd npm
  require_env FRONTEND_S3_BUCKET
  local deploy_env_label api_base_url
  deploy_env_label="${NODE_ENV:-dev}"
  log_section \
    "Agrinews AWS deploy · frontend · region ${AWS_REGION}" \
    "FRONTEND · deploy → ${deploy_env_label}"

  api_base_url="$(frontend_api_base_url)"
  log_info "bucket    s3://${FRONTEND_S3_BUCKET}/"
  log_info "api base  ${api_base_url}"

  log_step "Install deps + Vite build"
  pushd "$ROOT_DIR/apps/frontend" >/dev/null
  if [[ -d node_modules && ! -w node_modules ]]; then
    log_error "apps/frontend/node_modules is not writable."
    log_info "Run: sudo chown -R \"\$USER:\$USER\" apps/frontend/node_modules"
    exit 1
  fi
  run npm ci
  VITE_API_BASE_URL="$api_base_url" \
  VITE_APP_TITLE="${VITE_APP_TITLE:-agrinews}" \
    run npm run build
  popd >/dev/null

  log_step "Sync to S3"

  run aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} s3 sync \
    "$ROOT_DIR/apps/frontend/dist/" \
    "s3://${FRONTEND_S3_BUCKET}/" \
    --region "$AWS_REGION" \
    --delete \
    --exclude "index.html" \
    --cache-control "public,max-age=31536000,immutable"

  run aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} s3 cp \
    "$ROOT_DIR/apps/frontend/dist/index.html" \
    "s3://${FRONTEND_S3_BUCKET}/index.html" \
    --region "$AWS_REGION" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "text/html"

  if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
    log_step "CloudFront invalidation (/*)"
    run aws ${AWS_PROFILE_OPT[@]+"${AWS_PROFILE_OPT[@]}"} cloudfront create-invalidation \
      --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
      --paths "/*" >/dev/null
    log_success "Invalidation created for ${CLOUDFRONT_DISTRIBUTION_ID}"
  else
    log_warn "CLOUDFRONT_DISTRIBUTION_ID unset — skipped cache invalidation."
  fi

  log_success "Frontend uploaded: s3://${FRONTEND_S3_BUCKET}/"
  log_success "FRONTEND deploy (${deploy_env_label}) done"
}

_targets=()
[[ "$DEPLOY_BACKEND" -eq 1 ]] && _targets+=("backend")
[[ "$DEPLOY_FRONTEND" -eq 1 ]] && _targets+=("frontend")

if [[ "$DEPLOY_BACKEND" -eq 1 ]]; then
  deploy_backend
fi

if [[ "$DEPLOY_FRONTEND" -eq 1 ]]; then
  deploy_frontend
fi

# ── Summary ──────────────────────────────────────────────────────────────────
_elapsed="$(fmt_duration "$(( $(date +%s) - SCRIPT_START_TS ))")"
log_done "Deploy complete · ${_targets[*]} · ${_elapsed}"
