## Purpose & Scope

Terraform coding rules for `agrinews` mono-repository infrastructure. All generated code MUST comply.

---

## Module Structure

### Rule 1: Single Responsibility Per Module

Each module MUST manage exactly one logical infrastructure concern.

**Approved modules:** `vpc-module` (VPC, subnets, route tables, NAT/IGW) | `ecs-cluster` (ECS cluster, tasks, services, auto-scaling) | `rds-database` (RDS, parameter groups, subnet groups, SGs) | `alb-module` (ALB, target groups, listeners) | `cloudfront-cdn` (CloudFront, S3, OAC) | `waf-rules` (WAF ACL, rate limiting, geo-blocking) | `monitoring` (CloudWatch alarms, log groups, SNS)

```hcl
# CORRECT: VPC module with only VPC resources
resource "aws_vpc" "main" { cidr_block = var.vpc_cidr }
resource "aws_subnet" "public" { vpc_id = aws_vpc.main.id }

# WRONG: VPC module mixing ECS/RDS
resource "aws_ecs_cluster" "backend" { }  # Belongs in ecs-cluster module
```

### Rule 2: Standard File Structure

Every module/environment MUST contain: `main.tf` (resources/module compositions) | `variables.tf` (ALL variable declarations with descriptions/validations) | `outputs.tf` (ALL exported values with descriptions) | `README.md` (purpose, variables, outputs, usage)

```
infra/modules/ecs-cluster/
├── main.tf
├── variables.tf
├── outputs.tf
└── README.md
```

### Rule 3: Environment Isolation

Environment-specific configs in separate directories. Identical file structure across environments.

```
infra/environments/{dev,staging,prod}/
├── main.tf
├── variables.tf
├── terraform.tfvars
├── backend.tf
└── outputs.tf
```

---

## Naming Conventions

### Rule 4: Resource Naming - snake_case

ALL Terraform resource names MUST use `snake_case`.

```hcl
resource "aws_vpc" "main_vpc" { }              # CORRECT
resource "aws_security_group" "alb_sg" { }     # CORRECT
resource "aws_vpc" "mainVPC" { }               # WRONG: camelCase
resource "aws_security_group" "alb-sg" { }    # WRONG: kebab-case
```

### Rule 5: Module Directory Naming - kebab-case

Module directories MUST use `kebab-case`.

```
infra/modules/vpc-module/     # CORRECT
infra/modules/vpc_module/     # WRONG: snake_case
```

### Rule 6: Variable Naming - Descriptive snake_case

Include data type and unit in name when applicable.

```hcl
variable "ecs_task_cpu" { description = "CPU units (256 = 0.25 vCPU)" }
variable "rds_backup_retention_days" { description = "Backup retention period" }
variable "cpu" { }             # WRONG: Too vague
variable "multiAZ" { }         # WRONG: camelCase
```

---

## Variable & Output Design

### Rule 7: Mandatory Variable Descriptions

EVERY variable MUST have `description` field.

```hcl
variable "rds_instance_class" {
  description = "RDS instance type (e.g., db.t4g.micro, db.t4g.small)"
  type        = string
  default     = "db.t4g.micro"
}
# WRONG: Missing description
variable "instance_class" { type = string }
```

### Rule 8: Variable Validation Rules

Critical parameters (instance types, storage, scaling, CIDRs) MUST include validation.

```hcl
variable "rds_allocated_storage" {
  validation {
    condition     = var.rds_allocated_storage >= 20 && var.rds_allocated_storage <= 65536
    error_message = "RDS storage must be 20-65536 GB."
  }
}

variable "ecs_task_cpu" {
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.ecs_task_cpu)
    error_message = "ECS CPU must be valid Fargate value."
  }
}

variable "vpc_cidr" {
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be valid IPv4."
  }
}
```

### Rule 9: Sensitive Variable Marking

Variables with secrets/passwords/API keys MUST be marked `sensitive = true`.

```hcl
variable "db_master_password" {
  description = "Master password (stored in AWS Secrets Manager)"
  type        = string
  sensitive   = true
}
# WRONG: Missing sensitive = true for password
variable "db_password" { type = string }
```

### Rule 10: Output Documentation

ALL outputs MUST have descriptions. Only export consumed values.

```hcl
output "vpc_id" {
  description = "VPC ID for security groups/subnet associations"
  value       = aws_vpc.main.id
}
# WRONG: No description
output "vpc_id" { value = aws_vpc.main.id }
```

---

## State Management & Drift Prevention

### Rule 11: S3 Backend Configuration

ALL environments MUST use S3 backend with DynamoDB locking, encryption, and versioning.

```hcl
# infra/environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "d12-prod-terraform-state-123456789012"
    key            = "prod/ap-northeast-1/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "d12-prod-terraform-lock"
  }
}
```

### Rule 12: State File Path Convention

State paths MUST follow: `{environment}/{region}/terraform.tfstate`

- Development: `dev/ap-northeast-1/terraform.tfstate`
- Staging: `staging/ap-northeast-1/terraform.tfstate`
- Production: `prod/ap-northeast-1/terraform.tfstate`

### Rule 13: No Manual Infrastructure Changes

Staging/production changes MUST be in Terraform code + CI/CD. Manual AWS Console changes PROHIBITED. Development: Manual experimentation allowed, then immediate commit.

---

## Environment & Multi-AZ Strategy

### Rule 14: Environment-Specific Variable Files

Environment differences via `.tfvars` files. Module composition MUST be identical.

```hcl
# dev/terraform.tfvars
environment = "dev"
ecs_task_cpu = 256
rds_multi_az = false
availability_zones = ["ap-northeast-1a"]

# prod/terraform.tfvars
environment = "prod"
ecs_task_cpu = 1024
rds_multi_az = true
availability_zones = ["ap-northeast-1a", "ap-northeast-1c"]
```

### Rule 15: Multi-AZ Requirements

Production/staging MUST use Multi-AZ for ECS, RDS, ALB. Development MAY use single-AZ.

```hcl
# Production: Multi-AZ mandatory
variable "rds_multi_az" { default = true }
variable "availability_zones" { default = ["ap-northeast-1a", "ap-northeast-1c"] }

# Dev: Single-AZ allowed
variable "rds_multi_az" { default = false }
variable "availability_zones" { default = ["ap-northeast-1a"] }
```

### Rule 16: ECS Task Count Requirements

Production MUST run ≥2 tasks (Multi-AZ). Dev/staging MAY run 1 task.

```hcl
# Production
variable "ecs_task_desired_count" {
  default = 2
  validation {
    condition     = var.ecs_task_desired_count >= 2
    error_message = "Production requires ≥2 tasks for Multi-AZ HA."
  }
}
```

---

## Security & Secrets

### Rule 17: No Hardcoded Secrets

Passwords/keys MUST NEVER be in `.tf`/`.tfvars`. Use AWS Secrets Manager or sensitive variables.

```hcl
# CORRECT: Secrets Manager reference
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/rds/master-password"
}
resource "aws_db_instance" "postgres" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}

# WRONG: Hardcoded
resource "aws_db_instance" "postgres" {
  password = "SuperSecret123!"  # WRONG
}
```

### Rule 18: IAM Least Privilege

NO wildcard `*` actions unless justified with comment.

```hcl
# CORRECT: Specific permissions
policy = jsonencode({
  Statement = [{
    Effect   = "Allow"
    Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    Resource = "arn:aws:secretsmanager:${var.region}:${var.account}:secret:${var.environment}/*"
  }]
})

# WRONG: Wildcard
Action = "*"
Resource = "*"
```

### Rule 19: Encryption Enforcement

Data at rest (RDS, S3, EBS) and in transit (TLS) MUST be encrypted.

```hcl
resource "aws_db_instance" "postgres" {
  storage_encrypted = true  # REQUIRED
  kms_key_id        = aws_kms_key.rds.arn
}

resource "aws_lb_listener" "https" {
  port       = 443
  protocol   = "HTTPS"
  ssl_policy = "ELBSecurityPolicy-TLS-1-2-2017-01"
}
```

### Rule 20: Security Group Least Privilege

NO `0.0.0.0/0` inbound on private resources. Use security group references.

```hcl
# CORRECT: SG reference
resource "aws_security_group" "ecs" {
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]  # Not CIDR
  }
}

# WRONG: Open to internet
ingress {
  from_port   = 5432
  cidr_blocks = ["0.0.0.0/0"]  # WRONG for RDS
}
```

---

## Code Formatting & Comments

### Rule 21: Terraform Format Compliance

Run `terraform fmt -recursive` before committing. Use 2-space indentation.

```hcl
# CORRECT
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = merge(
    var.common_tags,
    { Name = "${var.environment}-vpc" }
  )
}
```

### Rule 22: Rationale Comments

Mark destructive changes and non-obvious decisions.

```hcl
# Single-AZ in dev saves $50/month. Prod overrides with multi_az = true
multi_az = var.rds_multi_az

# WARNING: Changing triggers replacement (~15min downtime)
allocated_storage = var.rds_allocated_storage

# Backup at 3-4 AM Tokyo time (lowest traffic)
backup_window = "18:00-19:00"  # UTC
```

### Rule 23: Block Comments for Complex Resources

Precede complex resources with purpose/dependencies.

```hcl
# CloudFront: S3 origin with OAC, 1-year cache, WAF enabled, price class 100
resource "aws_cloudfront_distribution" "static_assets" {
  enabled = true
  price_class = var.cloudfront_price_class
}
```

---

## Module Composition & Dependencies

### Rule 24: Module Composition Pattern

Environments MUST compose modules. NO resource definitions in environment files.

```hcl
# infra/environments/prod/main.tf - CORRECT
module "vpc" {
  source             = "../../modules/vpc-module"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "ecs" {
  source                 = "../../modules/ecs-cluster"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_task_cpu           = var.ecs_task_cpu
}

# WRONG: Direct resources in environment file
resource "aws_vpc" "main" { cidr_block = var.vpc_cidr }
```

### Rule 25: No Cross-Module Resource References

Modules communicate via inputs/outputs only.

```hcl
# Module A
output "vpc_id" { value = aws_vpc.main.id }

# Module B
variable "vpc_id" { type = string }
resource "aws_security_group" "ecs" { vpc_id = var.vpc_id }

# Environment
module "vpc" { source = "../../modules/vpc-module" }
module "ecs" { 
  source = "../../modules/ecs-cluster"
  vpc_id = module.vpc.vpc_id  # CORRECT
}

# WRONG: Direct cross-module reference
resource "aws_security_group" "ecs" {
  vpc_id = aws_vpc.main.id  # WRONG
}
```

### Rule 26: Module README Requirements

Every module MUST have `README.md` with: purpose, required variables, outputs, usage example.

```markdown
# ECS Cluster Module

## Purpose
Provisions ECS Fargate cluster, task definitions, services, auto-scaling.

## Required Variables
- `environment` (string): dev/staging/prod
- `vpc_id` (string): VPC ID for task placement
- `ecs_task_cpu` (number): CPU units (256/512/1024)

## Outputs
- `cluster_id`: ECS cluster ID
- `service_name`: ECS service name

## Usage
```hcl
module "ecs" {
  source       = "../../modules/ecs-cluster"
  environment  = "prod"
  vpc_id       = module.vpc.vpc_id
  ecs_task_cpu = 1024
}
```
```

### Rule 27: Cost Optimization Defaults

Defaults MUST use smallest viable config. Production scales via variables.

```hcl
variable "ecs_task_cpu" {
  description = "CPU units (256 = 0.25 vCPU)"
  default     = 256  # Smallest Fargate option
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.ecs_task_cpu)
    error_message = "Must be valid Fargate value."
  }
}
# Dev uses default 256, prod overrides via tfvars: ecs_task_cpu = 1024
```

### Rule 28: Common Tags Pattern

ALL resources MUST include common tags.

```hcl
variable "common_tags" {
  type = map(string)
  default = {
    Project     = "agrinews"
    ManagedBy   = "Terraform"
    Environment = var.environment
    CostCenter  = "Engineering"
  }
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags       = var.common_tags
}

resource "aws_ecs_cluster" "backend" {
  tags = merge(var.common_tags, { Name = "${var.environment}-ecs-cluster" })
}
```

---

## Validation Workflow

1. Run `terraform fmt -recursive` before committing
2. Run `terraform validate` to check syntax
3. Review `terraform plan` output for unintended changes
4. Verify security controls and encryption settings
5. Confirm variable validations and descriptions
6. Check module README documentation

