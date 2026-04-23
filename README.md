# agrinews — Cloud Subscriber Management System

> クラウド版購読者管理システム (ACSMS)
>
> Cloud-based subscriber management for Japan Agricultural News (日本農業新聞)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Backend** | NestJS + TypeScript (strict) |
| **Frontend** | Vue 3 + Vite (`<script setup>`) |
| **UI** | Ant Design Vue 4 + Tailwind CSS |
| **State** | Pinia (Setup Store) |
| **API Client** | Orval (auto-generated from OpenAPI) |
| **ORM** | TypeORM + PostgreSQL (RDS) |
| **Auth** | JWT RS256 + bcrypt + RBAC (model.action) |
| **Infra** | Terraform + AWS (ECS Fargate, RDS, S3, CloudFront) |
| **CI/CD** | GitLab CI/CD |
| **Testing** | Vitest + Vue Test Utils + Playwright |
| **Monitoring** | CloudWatch (Logs, Metrics, Alarms) |

---

## Project Structure

```
agrinews/
├── .claude/                    # Claude Code AI configuration
│   ├── agents/                 # Reserved
│   ├── commands/               # Claude Code commands (see below)
│   ├── rules/                  # 11 mandatory coding rules
│   ├── skills/                 # Reserved
│   ├── settings.json
│   └── CLAUDE.md
│
├── apps/
│   ├── backend/                # NestJS backend (domain modules)
│   ├── frontend/               # Vue 3 SPA
│   ├── docker/
│   └── docker-compose.yml
│
├── docs/
│   ├── database/               # Schema design + seeder definitions
│   ├── design/                 # Screen designs (ACSMS-SCR-001 ~ 031)
│   ├── design-vi/              # Vietnamese translations
│   └── requirement/            # Requirements (Japanese → Markdown)
│
├── scripts/                    # Excel ↔ Markdown conversion tools
├── .gitignore
└── README.md
```

---

## Roles & Permissions

| Role | Code | Scope |
| --- | --- | --- |
| 日農（管理者） | `NICHINO_ADMIN` | Full admin — JA master, accounts, announcements |
| 日農（担当者） | `NICHINO_STAFF` | Dealer proxy input, file management |
| 中央会 | `CHUOKAI` | Prefecture-level JA coordinator |
| JA本店 | `JA_HONTEN` | JA headquarters — own JA data |
| JA管理支店 | `JA_KANRI_SHITEN` | JA branch — own branch data |

Authorization: 3-layer model (Permission Guard → DataScope Filter → Field-Level Restriction)

---

## Documentation

| Document | Location |
| --- | --- |
| Requirements | `docs/requirement/` |
| Database Schema | `docs/database/database-design.md` |
| Seeder Data | `docs/database/seeder.md` |
| Screen Designs | `docs/design/ACSMS-SCR-*` |

---

## Claude Code Commands

### `/gen-api-doc ACSMS-SCR-XXX` — Generate API design document

Generate API設計書 from screen design + database schema. Follow the standard response/error format.

```bash
# In Claude Code CLI
/gen-api-doc ACSMS-SCR-010
```

**What it does:**
1. Read screen design (`screen-design.md` or `index.html`) in `docs/design/ACSMS-SCR-XXX/`
2. Read database schema (`docs/database/database-design.md`) and seeder (`docs/database/seeder.md`)
3. Read requirements (`docs/requirement/account_concept.md`) for permissions and DataScope
4. Use `docs/design/ACSMS-SCR-003/ACSMS-SCR-003-api.md` as template
5. Generate `ACSMS-SCR-XXX-api.md` with correct format

**Output:** `docs/design/ACSMS-SCR-XXX/ACSMS-SCR-XXX-api.md`

### `/review` — Code review

```bash
/review                    # Review current changes
/review apps/backend/      # Review specific path
```

### `/fix-issue` — Fix bug

```bash
/fix-issue Login redirect fails after MFA verification
```

### `/deploy` — Deploy

```bash
/deploy dev    # Deploy to development
/deploy prod   # Deploy to production
```

---

## Development Workflow

```
Phase 1: Documentation (current)
  /gen-api-doc ACSMS-SCR-XXX   → Generate API doc → Review → Commit

Phase 2: Scaffold (one-time)
  Claude Code generates NestJS + Vue 3 project structure

Phase 3: Code Generation (per screen)
  Generate backend  → NestJS module (entity, DTO, service, controller)
  Generate frontend → Vue page + components + store
  Generate tests    → Unit tests + integration tests

Phase 4: Quality (per MR)
  /review    → Check code quality
  /fix-issue → Fix bugs
  /deploy    → Deploy to environment
```

---

## Security

> **NEVER commit:** `.env` files, API keys, secrets, `.claude/settings.local.json`

All secrets via AWS Secrets Manager. See `.claude/rules/security.md`.
