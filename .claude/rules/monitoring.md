# Monitoring & Observability — CloudWatch + NestJS

> Standards for logging, metrics, and alerting in the `agrinews` project on AWS.

---

## Monitoring Architecture

| Pillar | Tool | Purpose |
|--------|------|---------|
| **Logs** | CloudWatch Logs (structured JSON) | What happened |
| **Metrics** | CloudWatch Metrics + Alarms | How the system is behaving |
| **Traces** | CloudWatch X-Ray (optional) | Why something is slow |

---

## 📝 Logging Rules

### Log Levels
| Level | When to Use |
|-------|-------------|
| `error` | Unexpected failure requiring attention |
| `warn` | Unexpected but recoverable situation |
| `log` | Normal significant events (NestJS default for info) |
| `debug` | Detailed debugging info (dev only) |
| `verbose` | Very verbose (never in production) |

### Structured JSON Logging (MANDATORY)
```ts
// ✅ Structured log — searchable in CloudWatch Insights
this.logger.log({
  event: 'order.placed',
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  durationMs: Date.now() - startTime,
  requestId: req.id,
});

// ❌ Unstructured log — cannot be queried
console.log(`Order ${orderId} placed by user ${userId}`);
```

### Mandatory Fields
```ts
{
  level: 'log',
  timestamp: '2026-01-01T00:00:00.000Z',
  service: 'agrinews-backend',
  environment: 'production',
  requestId: 'uuid',          // trace across requests
  userId: 'uuid',             // who triggered it
  event: 'order.placed',      // what happened
  durationMs: 45,             // how long
}
```

### What NOT to Log
```ts
// ❌ NEVER log sensitive data
logger.log({ password: user.password });           // NEVER
logger.log({ token: req.headers.authorization });   // NEVER
```

### NestJS Logger Setup
```ts
// Use NestJS built-in Logger per class
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async findById(id: string) {
    this.logger.log({ event: 'user.findById', userId: id });
    // ...
  }
}
```

---

## 📊 CloudWatch Metrics & Alarms

### Required Alarms per Resource

| Resource | Metric | Threshold | Severity |
|---|---|---|---|
| **ECS Service** | CPU Utilization | > 80% for 5min | Warning |
| **ECS Service** | Memory Utilization | > 80% for 5min | Warning |
| **ECS Service** | Running Task Count | < desired count | Critical |
| **RDS** | CPU Utilization | > 70% for 10min | Warning |
| **RDS** | FreeStorageSpace | < 20GB | Warning |
| **RDS** | DatabaseConnections | > 80% of max | Critical |
| **ALB** | 5xx Error Rate | > 1% for 5min | Warning |
| **ALB** | Target Response Time P99 | > 2s for 5min | Warning |
---

## 🚨 Alerting

### Severity Levels
| Level | Response | Channel |
|-------|----------|---------|
| `critical` | Immediate | PagerDuty / SMS |
| `warning` | Within 30min | Slack |
| `info` | Business hours | Email / Dashboard |

### CloudWatch Alarm Naming
```
# Pattern: {Environment}-{Service}-{Metric}-{Severity}
prod-agrinews-backend-cpu-high-warning
prod-agrinews-rds-storage-low-critical
prod-agrinews-alb-5xx-rate-warning
prod-agrinews-ai-errors-high-warning
```

---

## CloudWatch Insights — Useful Queries

### Error Rate
```
fields @timestamp, event, statusCode, @message
| filter level = 'error'
| stats count() as errorCount by bin(5m)
```

### Slow Requests
```
fields @timestamp, event, durationMs, @message
| filter durationMs > 2000
| sort durationMs desc
| limit 20
```

---

## ECS Health Checks

```
GET /health        → Basic liveness (is the service running?)
GET /health/ready  → Readiness (is DB connected, is service ready?)
```

### Health Check Implementation
```ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    // Check DB connection
    return { status: 'ok', db: 'connected', cache: 'connected' };
  }
}
```

---

## Checklist

- [ ] Structured JSON logging (no console.log)
- [ ] Logger per class: `new Logger(ClassName.name)`
- [ ] No sensitive data in logs
- [ ] CloudWatch alarms for ECS, RDS, ALB
- [ ] Health check endpoints implemented
- [ ] Request ID propagated across log entries
