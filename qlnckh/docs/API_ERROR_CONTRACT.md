# API Error Contract

**Version:** 1.0
**Last Updated:** 2026-01-05
**Status:** ENFORCED

---

## Overview

All API endpoints MUST return errors in the following standardized format. This contract ensures consistent error handling across frontend and backend.

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "error_code": "ERROR_CODE_CONSTANT",
    "message": "Human readable error message in Vietnamese"
  }
}
```

**Rules:**
1. `success` is ALWAYS `false` for error responses
2. `error.error_code` is the error identifier (NOT `code`)
3. `error.message` is user-friendly Vietnamese message
4. HTTP status code should match the error type (400, 401, 403, 404, 409, 500)

---

## Standard Error Codes

### Authentication Errors (401)

| Error Code | Message | Usage |
|------------|---------|-------|
| `UNAUTHORIZED` | Chưa đăng nhập | User not authenticated |
| `INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng | Login failed |
| `INVALID_TOKEN` | Token không hợp lệ | JWT validation failed |
| `REFRESH_TOKEN_REVOKED` | Vui lòng đăng nhập lại | Refresh token expired/revoked |
| `REFRESH_TOKEN_EXPIRED` | Phiên làm việc đã hết hạn | Refresh token TTL exceeded |

### Authorization Errors (403)

| Error Code | Message | Usage |
|------------|---------|-------|
| `FORBIDDEN` | Bạn không có quyền thực hiện hành động này | User lacks permission |
| `DEMO_MODE_DISABLED` | Chế độ demo không được bật | Demo feature accessed outside demo mode |

### Not Found Errors (404)

| Error Code | Message | Usage |
|------------|---------|-------|
| `USER_NOT_FOUND` | Không tìm thấy người dùng | User lookup failed |
| `HOLIDAY_NOT_FOUND` | Không tìm thấy ngày lễ | Holiday lookup failed |
| `NOT_FOUND` | Tài nguyên không tồn tại | General not found |

### Conflict Errors (409)

| Error Code | Message | Usage |
|------------|---------|-------|
| `EMAIL_EXISTS` | Email đã được sử dụng | Duplicate email on create |
| `HOLIDAY_DATE_EXISTS` | Ngày này đã tồn tại trong hệ thống | Duplicate holiday date |

### Validation Errors (400)

| Error Code | Message | Usage |
|------------|---------|-------|
| `AUTH_VALIDATION_ERROR` | Dữ liệu đăng nhập không hợp lệ | Login validation failed |
| `NOT_CONFIRMED` | Vui lòng xác nhận reset demo | Confirmation required |

---

## Module-Specific Error Codes

### Auth Module

```typescript
// auth.service.ts, auth.controller.ts, strategies
error_code: 'UNAUTHORIZED'
error_code: 'INVALID_CREDENTIALS'
error_code: 'AUTH_VALIDATION_ERROR'
error_code: 'LOGIN_ERROR'
error_code: 'REFRESH_TOKEN_REVOKED'
error_code: 'REFRESH_TOKEN_EXPIRED'
error_code: 'REFRESH_ERROR'
error_code: 'LOGOUT_ERROR'
error_code: 'USER_NOT_FOUND'
error_code: 'GET_USER_ERROR'
error_code: 'INVALID_TOKEN'
```

### Users Module

```typescript
// users.service.ts
error_code: 'USER_CREATE_ERROR'
error_code: 'USER_UPDATE_ERROR'
error_code: 'USER_DELETE_ERROR'
error_code: 'USER_NOT_FOUND'
error_code: 'EMAIL_EXISTS'
error_code: 'FACULTY_NOT_FOUND'
error_code: 'CANNOT_DELETE_SELF'
```

### RBAC Module

```typescript
// permissions.guard.ts, roles.guard.ts
error_code: 'FORBIDDEN'
```

### Demo Module

```typescript
// demo.service.ts, demo.controller.ts
error_code: 'DEMO_MODE_DISABLED'
error_code: 'INVALID_DEMO_PERSONA'
error_code: 'PERSONA_NOT_FOUND'
error_code: 'NOT_FOUND' (for reset endpoint)
error_code: 'UNAUTHORIZED'
error_code: 'FORBIDDEN'
error_code: 'NOT_CONFIRMED'
```

### Calendar Module

```typescript
// calendar.service.ts
error_code: 'HOLIDAY_NOT_FOUND'
error_code: 'HOLIDAY_DATE_EXISTS'
```

---

## Developer Checklist

When adding a new endpoint:

1. **Use `error_code`** (NOT `code`) in all error responses
2. **Define error code constant** in appropriate module/service
3. **Add to this document** if introducing new error codes
4. **Update tests** to expect `error_code` format
5. **Use appropriate HTTP status** (401, 403, 404, 409, 500)

---

## Examples

### Bad (OLD format - DO NOT USE):

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền"
  }
}
```

### Good (NEW format - REQUIRED):

```json
{
  "success": false,
  "error": {
    "error_code": "FORBIDDEN",
    "message": "Bạn không có quyền thực hiện hành động này"
  }
}
```

---

## Migration Status

| Module | Status | Files Updated |
|--------|--------|---------------|
| Auth | ✅ MIGRATED | auth.service.ts, auth.controller.ts, strategies |
| Users | ✅ MIGRATED | users.service.ts |
| RBAC | ✅ MIGRATED | permissions.guard.ts, roles.guard.ts |
| Demo | ✅ MIGRATED | demo.service.ts, demo.controller.ts |
| Calendar | ✅ MIGRATED | calendar.service.ts |

---

*This contract is ENFORCED for all new code. Violations will be caught in code review.*
