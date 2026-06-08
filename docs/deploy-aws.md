# AWS deploy (`scripts/deploy-aws.sh`)

Guide for deploying the backend (ECS + ECR) and frontend (S3 + CloudFront).

## Prerequisites

Install the tools below on the machine that runs `./scripts/deploy-aws.sh`. Verify everything with the check commands at the end.

| Tool | Used for |
| --- | --- |
| [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) | ECR, ECS, S3, CloudFront |
| [Docker](https://docs.docker.com/get-docker/) | Build and push backend image |
| [Node.js 22+](https://nodejs.org/) + npm | Frontend `npm ci` / `npm run build` |
| Python 3 | Merge env vars into ECS task definition |
| [jq](https://jqlang.org/) | JSON transforms for ECS task definition |

### macOS

Install [Homebrew](https://brew.sh/) if you do not have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install the prerequisites:

```bash
# AWS CLI, jq, Python 3
brew install awscli jq python@3

# Docker Desktop (includes the docker CLI and daemon)
brew install --cask docker
```

**Node.js** — use Homebrew or [nvm](https://github.com/nvm-sh/nvm) (recommended to match the repo):

```bash
# Option A — Homebrew
brew install node@22
brew link node@22 --force --overwrite

# Option B — nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# Restart the shell, then:
nvm install 22
nvm use 22
```

Start **Docker Desktop** from Applications before deploying (menu bar whale icon → “Docker Desktop is running”).

Add Python 3 to your `PATH` if Homebrew prints a hint after install, e.g.:

```bash
echo 'export PATH="/opt/homebrew/opt/python@3/libexec/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Linux (Debian / Ubuntu)

```bash
sudo apt update
sudo apt install -y awscli jq python3 docker.io

# Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Enable and start Docker:

```bash
sudo systemctl enable --now docker

# Allow your user to run docker without sudo (log out/in or run newgrp after this)
sudo usermod -aG docker "$USER"
newgrp docker
```

### Linux (Fedora / RHEL / Amazon Linux 2023)

```bash
# AWS CLI v2 (official bundle — preferred over the distro package)
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip

# Other tools
sudo dnf install -y jq python3 docker
# Amazon Linux 2023: sudo dnf install -y nodejs npm  (or use nvm for Node 22)

# Node 22 via nvm if the distro Node is too old
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker
```

### AWS credentials

Configure a profile with permission for ECR, ECS, S3, and CloudFront in the target account:

```bash
aws configure
# AWS Access Key ID: ...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-1
# Default output format: json
```

Or use SSO / IAM Identity Center:

```bash
aws configure sso
```

Set the profile in `apps/backend/.env.deploy` or `apps/frontend/.env.deploy` when not using the default:

```bash
AWS_PROFILE=your-profile-name
```

Verify credentials and region:

```bash
aws sts get-caller-identity
aws configure get region
```

### Verify all prerequisites

Run from the repo root:

```bash
command -v aws && aws --version
command -v docker && docker info >/dev/null && echo "Docker OK"
command -v node && node --version    # expect v22.x
command -v npm && npm --version
command -v python3 && python3 --version
command -v jq && jq --version
aws sts get-caller-identity
```

If any command fails, fix that tool before running `./scripts/deploy-aws.sh`.

## Env file layout

Each app has its **own `.env.deploy` file** — there is no shared file at the repo root.

| File | Purpose |
| --- | --- |
| `apps/backend/.env.deploy` | Backend deploy (ECR, ECS, migration, seed) **and** ECS runtime env |
| `apps/frontend/.env.deploy` | Frontend deploy (S3, CloudFront, Vite build-time vars) |

Copy from the examples before the first deploy:

```bash
cp apps/backend/.env.deploy.example apps/backend/.env.deploy
cp apps/frontend/.env.deploy.example apps/frontend/.env.deploy
```

Both files are **gitignored** — do not commit secrets.

### `apps/backend/.env.deploy`

Two sections (see comments in the file):

1. **Deploy** — `BACKEND_ECR_REPOSITORY`, `ECS_*`, `BACKEND_RUN_*`, …  
   Read by the deploy script but **not** injected into the ECS container.

2. **Runtime** — `DB_*`, `REDIS_*`, `ALLOWED_ORIGINS`, …  
   Non-secret keys are merged into the ECS task definition on deploy.  
   Secrets (`DB_PASSWORD`, `SESSION_SECRET`, …) should live in **AWS Secrets Manager** (task definition `.secrets` block); the deploy script skips them for plaintext injection.

### `apps/frontend/.env.deploy`

| Variable | Required | Notes |
| --- | --- | --- |
| `FRONTEND_S3_BUCKET` | yes | Static hosting bucket |
| `CLOUDFRONT_DISTRIBUTION_ID` | recommended | Invalidate cache after upload |
| `VITE_API_BASE_URL` | optional | Default: `https://<cloudfront-domain>` — do **not** append `/api` |
| `VITE_APP_TITLE` | optional | Default `agrinews` |
| `AWS_REGION` | optional | Default `ap-northeast-1` |

## Deploy commands

```bash
# Backend + frontend
./scripts/deploy-aws.sh

# Backend only
./scripts/deploy-aws.sh --backend-only

# Frontend only
./scripts/deploy-aws.sh --frontend-only

# Optional extra env file (e.g. AWS profile overrides)
./scripts/deploy-aws.sh --env-file .env.aws-profile
```

## Backend flow

1. Build `apps/docker/backend/Dockerfile.prod` → push to ECR  
2. Register ECS task definition (new image + runtime env from `apps/backend/.env.deploy`)  
3. ECS one-off task: `migration:run:prod` (every deploy)  
4. ECS one-off task: `seed:prod` + `seed:dev:prod` (first deploy, or `BACKEND_RUN_SEED_DEV=always`)  
5. `update-service` with the new task definition  

### Seed / migration

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKEND_RUN_MIGRATIONS` | `1` | Run migrations before rollout |
| `BACKEND_RUN_SEED_DEV` | `once` | `once` \| `always` \| `never` |
| `BACKEND_SEED_DEV_S3_BUCKET` | — | S3 bucket for the “seed completed” marker (often same as `FRONTEND_S3_BUCKET`) |

Re-run seed by deleting the marker:

```bash
aws s3 rm s3://<bucket>/.deploy/<cluster>-backend-seed-dev.done
```

## Frontend flow

1. `npm ci && npm run build` with `VITE_*` from `apps/frontend/.env.deploy`  
2. `aws s3 sync` dist → bucket  
3. CloudFront invalidation `/*` (when `CLOUDFRONT_DISTRIBUTION_ID` is set)  

## Troubleshooting

| Error | Fix |
| --- | --- |
| `no pg_hba.conf entry … no encryption` | Set `DB_SSL=true` in `apps/backend/.env.deploy` |
| `Cannot find module 'tsconfig-paths/register'` | Rebuild backend image (Dockerfile installs ts-node for seed) |
| FE calls `/api/api/v1/...` | `VITE_API_BASE_URL` must not include a `/api` suffix |
| ECS `Unknown parameter … "image"` | Fixed — migrations run on a task definition that already references the new image |

## Related docs

- [README.md § First-deploy admin bootstrap](../README.md#first-deploy-admin-bootstrap)
- `.claude/commands/deploy.md` — CI/CD checklist
