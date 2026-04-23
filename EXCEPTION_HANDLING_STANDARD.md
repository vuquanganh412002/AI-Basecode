# Exception Handling Standard — Backend & Frontend

> Standardized error handling approach for agrinews project.

---

## 📋 Overview

Both backend and frontend follow a **consistent error response format** and **standardized error codes**. The system is well-structured but has some implementation issues.

### Response Format (Unified)

```json
// Success (HTTP 200)
{
  "data": { ... } // or { "data": [...] } for lists
}

// Error (HTTP 4xx/5xx)
{
  "error_code": "ERROR_CODE",
  "message": "User-friendly message in Japanese",
  "errors": [                           // Optional, only for VALIDATION_ERROR
    { "field": "email", "message": "メールアドレスが不正です" }
  ]
}
```

---

## 🔙 Backend Exception Handling (NestJS)

### Layer 1: Global Exception Filter

**File**: [apps/backend/src/common/filters/global-exception.filter.ts](apps/backend/src/common/filters/global-exception.filter.ts)

Catches ALL exceptions and returns standardized response:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // 1. Determine status, code, message based on exception type
    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      // Extract code/message/errors from response
    }

    // 2. Log structured error (never expose to client)
    this.logger.error({
      event: 'api.error',
      statusCode: status,
      code,
      path: request.url,
      requestId: req.id,  // X-Request-ID header
      userId: req.user?.accountId,
    });

    // 3. Hide internal errors from client
    if (status === 500) {
      message = 'システムエラーが発生しました。しばらくしてから再度お試しください';
    }

    // 4. Return structured JSON
    response.status(status).json({ error_code: code, message, errors });
  }
}
```

**Registered** in [apps/backend/src/main.ts](apps/backend/src/main.ts#L36):
```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

### Layer 2: Domain Exception Pattern

**File**: [apps/backend/src/common/exceptions/domain.exception.ts](apps/backend/src/common/exceptions/domain.exception.ts)

Services throw custom domain exceptions:

```typescript
export class DomainException extends HttpException {
  constructor(
    message: string,
    public readonly code: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super({ message, code }, status);
  }
}
```

**Example** (from [apps/backend/src/modules/auth/auth.service.ts](apps/backend/src/modules/auth/auth.service.ts)):
```typescript
// In service
if (!user || !isPasswordValid) {
  throw new InvalidCredentialsException();
  // → Returns 401 { error_code: 'INVALID_CREDENTIALS', message: '...' }
}
```

### Layer 3: Validation Error Factory

**File**: [apps/backend/src/main.ts](apps/backend/src/main.ts#L17-L26)

Custom validation error handler:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      const details = errors.map((e) => ({
        field: e.property,
        message: Object.values(e.constraints || {}).join(', '),
      }));
      return {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: '入力値が不正です。詳細はerrorsフィールドを確認してください',
        errors: details,
      };
    },
  }),
);
```

Returns **400** with `errors[]` array containing field-level details.

### Standardized Error Codes (Backend)

| HTTP | error_code | message | When |
|------|-----------|---------|------|
| 400 | `BAD_REQUEST` | リクエストパラメータが不正です | Invalid request params |
| 400 | `VALIDATION_ERROR` | 入力値が不正です | DTO validation fails |
| 400 | `DUPLICATE_CODE` | 同一のXXXが既に登録されています | Unique constraint violation |
| 401 | `UNAUTHORIZED` | セッションが切れました。再度ログインしてください | Invalid/expired token |
| 401 | `INVALID_CREDENTIALS` | メールアドレスまたはパスワードが正しくありません | Login fails |
| 401 | `INVALID_MFA_TOKEN` | MFAトークンが無効です | MFA token expired |
| 403 | `FORBIDDEN` | この画面へのアクセス権限がありません | Permission denied |
| 403 | `DATA_SCOPE_VIOLATION` | このデータへのアクセス権限がありません | DataScope violation |
| 404 | `NOT_FOUND` | 指定されたXXXが見つかりません | Resource not found |
| 409 | `CONFLICT` | 関連データが存在するため削除できません | Related records exist |
| 429 | `TOO_MANY_REQUESTS` | リクエスト回数が上限を超えました | Rate limit exceeded |
| 429 | `OTP_RESEND_LIMIT` | コードの再送回数が上限に達しました | MFA resend limit |
| 500 | `INTERNAL_SERVER_ERROR` | システムエラーが発生しました。しばらくしてから再度お試しください | Unknown error |

---

## 🖥️ Frontend Exception Handling (Vue 3 + Axios)

### Request Interceptor

**File**: [apps/frontend/src/api/axios-instance.ts](apps/frontend/src/api/axios-instance.ts#L11-L22)

⚠️ **Currently BROKEN** — dynamic import causes race condition:

```typescript
instance.interceptors.request.use((config) => {
  // ❌ BROKEN: Returns before auth header is added
  const authModule = import('@/stores/auth.store');
  authModule.then(({ useAuthStore }) => {
    const authStore = useAuthStore();
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;  // Too late!
    }
  });
  return config;  // Interceptor completes before import finishes
});
```

**Fix**: Use static import at top of file:
```typescript
import { useAuthStore } from '@/stores/auth.store';

instance.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});
```

### Response Interceptor

**File**: [apps/frontend/src/api/axios-instance.ts](apps/frontend/src/api/axios-instance.ts#L24-L62)

Handles different HTTP status codes with appropriate FE actions:

```typescript
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error_code;
    const message = error.response?.data?.message;

    // 401 Unauthorized — Try refresh token
    if (status === 401) {
      try {
        const { useAuthStore } = await import('@/stores/auth.store');
        const authStore = useAuthStore();
        await authStore.refreshToken();
        return instance(error.config);  // Retry original request
      } catch {
        // Refresh failed → redirect to login
        router.push({
          name: 'Login',
          query: { redirect: router.currentRoute.value.fullPath }
        });
      }
    }

    // 403 Forbidden — Check reason
    if (status === 403 && errorCode === 'DATA_SCOPE_VIOLATION') {
      message.error('このデータへのアクセス権限がありません');
    } else if (status === 403) {
      router.push({ name: 'Forbidden' });
    }

    // 422 Validation Error — Return to component (form field mapping)
    if (status === 422) {
      return Promise.reject(error);  // Component handles field mapping
    }

    // 429 Rate Limited
    if (status === 429) {
      message.error('リクエスト回数が上限を超えました。しばらくしてから再度お試しください');
    }

    // 500 Server Error
    if (status === 500) {
      message.error('システムエラーが発生しました。しばらくしてから再度お試しください');
    }

    return Promise.reject(error);
  }
);
```

### Frontend Error Type

**File**: [apps/frontend/src/types/index.ts](apps/frontend/src/types/index.ts)

```typescript
export interface ApiError {
  error_code: string;
  message: string;
  errors?: { field: string; message: string }[];
}
```

### Standardized Frontend Error Handling

| HTTP | error_code | FE Action |
|------|-----------|-----------|
| 400 | `BAD_REQUEST` | Show toast message |
| 400 | `VALIDATION_ERROR` | Return error to component, map to form fields |
| 401 | `UNAUTHORIZED` | Try refresh token, if fails → redirect `/login` |
| 403 | `FORBIDDEN` | Redirect → `/403` |
| 403 | `DATA_SCOPE_VIOLATION` | Show toast message |
| 404 | `NOT_FOUND` | Show toast, redirect to list |
| 429 | `TOO_MANY_REQUESTS` | Show toast + disable button |
| 500 | `INTERNAL_SERVER_ERROR` | Show generic toast message |

---

## ✅ Strengths

1. **Centralized Backend Filter**
   - ✅ Single point of exception handling (global-exception.filter.ts)
   - ✅ Consistent response format across all endpoints
   - ✅ Structured logging with requestId, userId for debugging
   - ✅ Hides internal errors from client (security)

2. **Domain Exception Pattern**
   - ✅ Services throw custom exceptions with codes
   - ✅ Exceptions propagate to filter (no try/catch swallowing)
   - ✅ Easy to add new error types

3. **Validation Error Factory**
   - ✅ Field-level validation details in response
   - ✅ Frontend can map errors to form fields

4. **Frontend Error Handling**
   - ✅ Response interceptor unified (one place for all error handling)
   - ✅ Token refresh logic centralized
   - ✅ Appropriate user-facing messages (Japanese)
   - ✅ Status-code-specific handling (401 vs 403 vs 429)

5. **Error Code Convention**
   - ✅ All 31+ API design docs use same error codes
   - ✅ Frontend can handle predictably
   - ✅ Easy to add new codes (backwards compatible)

---

## ⚠️ Issues & Gaps

### Critical Issues

| Issue | File | Impact | Fix |
|-------|------|--------|-----|
| **Request interceptor race condition** | `axios-instance.ts:13-22` | Bearer token NEVER attached to requests | Remove dynamic import, use static import at top |
| **401 handling doesn't clear auth** | `axios-instance.ts:31-36` | If refresh fails, store still has stale token | Call `authStore.logout()` before redirecting |

### Medium Issues

| Issue | Impact | Recommendation |
|-------|--------|-----------------|
| **No form field mapping on 422** | VALIDATION_ERROR returned but component must manually map | Define common form error handler composable |
| **No timeout on external requests** | External API calls hang indefinitely | Add timeout: 30s to all axios calls |
| **No circuit breaker** | Cascading failures if BE unreachable | Add exponential backoff + fallback UI |
| **Refresh token not in HTTP-only cookie** | Token may be exposed if XSS occurs | Verify Set-Cookie header has `HttpOnly, Secure, SameSite=Strict` |

---

## 📊 Error Flow Diagram

```
Backend Service throws Exception
         ↓
  GlobalExceptionFilter catches
         ↓
  Extract: status, code, message, errors
         ↓
  Log: { event, statusCode, code, requestId, userId, ... }
         ↓
  Return: { error_code, message, errors? }
         ↓
  Frontend receives error.response
         ↓
  axios response interceptor extracts: status, errorCode, message
         ↓
  Status-specific action:
    • 401 → Try refresh → Retry OR redirect /login
    • 403 (DATA_SCOPE) → Toast message
    • 403 (FORBIDDEN) → Redirect /403
    • 422 → Return to component for field mapping
    • 429 → Toast + disable button
    • 500 → Toast message
         ↓
  Promise.reject(error) → Component can further handle
```

---

## 🔧 Implementation Checklist

### Backend
- [x] GlobalExceptionFilter catches all exceptions
- [x] DomainException extends HttpException
- [x] ValidationPipe exceptionFactory returns structured errors
- [x] All services throw domain exceptions (never let raw errors propagate)
- [x] Logger.error() in filter with structured JSON
- [x] Hide 500 error messages from client
- [x] X-Request-ID header propagated (RequestIdMiddleware)

### Frontend
- [ ] **FIX**: Remove dynamic import from request interceptor
- [ ] **FIX**: Clear auth state on 401 refresh failure
- [ ] Response interceptor handles all status codes
- [ ] Ant Design Vue `message.error()` for user feedback
- [ ] Router navigation for 401/403
- [ ] Form validation (422) mapped to component fields
- [ ] Axios instance created with `withCredentials: true`
- [ ] HTTP-only refresh token in cookie

---

## 📚 Related Files

**Backend**:
- [main.ts - ValidationPipe & GlobalExceptionFilter setup](apps/backend/src/main.ts)
- [global-exception.filter.ts](apps/backend/src/common/filters/global-exception.filter.ts)
- [domain.exception.ts](apps/backend/src/common/exceptions/domain.exception.ts)
- [nestjs.md - Error Handling Rules](.claude/rules/nestjs.md#error-handling)

**Frontend**:
- [axios-instance.ts - Interceptors](apps/frontend/src/api/axios-instance.ts)
- [types/index.ts - ApiError interface](apps/frontend/src/types/index.ts)

**Documentation**:
- [docs/design/ACSMS-SCR-*/api.md - All error code definitions](docs/design/)

---

## 🎯 Conclusion

**YES, exception handling is standardized.** The approach is:
- **Well-designed**: Centralized filter, consistent response format, proper error codes
- **Partially implemented**: Backend complete, frontend has bugs in request interceptor
- **Well-documented**: All error codes in 31 API design docs, rules in `.claude/rules/nestjs.md`
- **Needs fixes**: 2 critical issues in axios interceptor (race condition, incomplete 401 handling)

**Recommendation**: Fix the axios request interceptor bugs (Priority 1) before deploying to production.
