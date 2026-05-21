# Deploy Command

## Description
Deploy the application to the target environment via GitLab CI/CD + AWS ECS.

## Usage
`/deploy [dev|stg|prod]`

## Pre-deploy Checklist
- [ ] All tests pass
- [ ] No lint errors
- [ ] Database migrations committed
- [ ] Environment variables configured in AWS Secrets Manager

## Environments

| Environment | Branch | Trigger | Approval |
| --- | --- | --- | --- |
| dev | Any | Auto on MR merge | None |
| stg | `main`, `release/*` | Manual trigger | None |
| prod | `main` only | Manual trigger | Required |

## Deploy Steps

### 1. Build Docker Image
```bash
docker build -t agrinews-backend:latest -f apps/backend/Dockerfile .
```

### 2. Push to ECR
```bash
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-northeast-1.amazonaws.com
docker tag agrinews-backend:latest <account>.dkr.ecr.ap-northeast-1.amazonaws.com/agrinews:<tag>
docker push <account>.dkr.ecr.ap-northeast-1.amazonaws.com/agrinews:<tag>
```

### 3. Run Migrations
```bash
npm run migration:run
```

### 4. Update ECS Service
```bash
aws ecs update-service --cluster agrinews-<env>-cluster --service agrinews-<env>-service --force-new-deployment
```

### 5. Post-deploy Verification
- Check health endpoint: `GET /health`
- Check readiness: `GET /health/ready`
- Verify CloudWatch logs for errors

## Rollback
```bash
aws ecs update-service --cluster agrinews-<env>-cluster --service agrinews-<env>-service --task-definition agrinews-<env>-task:<previous-revision>
```

## Notes
- Image tags: `{branch}-{commit_sha_short}` (dev/stg), `v{semver}` (prod)
- Never use `latest` tag for production
- See `gitlab-ci.md` for pipeline YAML rules
- See `terraform.md` for infrastructure provisioning
