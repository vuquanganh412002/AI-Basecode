{
  "screen_id": "{{SCREEN_ID}}",
  "screen_name": "{{SCREEN_NAME}}",
  "users": {
    "nichino_admin": {
      "login_id": "nichino_admin",
      "password": "Test1234!",
      "role_code": "NICHINO_ADMIN",
      "ja_id": null,
      "permissions": ["{{permission_view}}", "{{permission_create}}", "{{permission_update}}", "{{permission_delete}}"]
    },
    "chuokai": {
      "login_id": "chuokai",
      "password": "Test1234!",
      "role_code": "CHUOKAI",
      "ja_id": 2,
      "permissions": ["{{permission_view}}"]
    },
    "ja_honten": {
      "login_id": "ja_honten",
      "password": "Test1234!",
      "role_code": "JA_HONTEN",
      "ja_id": 3,
      "permissions": ["{{permission_view}}", "{{permission_update}}"]
    },
    "ja_kanri": {
      "login_id": "ja_kanri",
      "password": "Test1234!",
      "role_code": "JA_KANRI_SHITEN",
      "ja_id": 3,
      "permissions": ["{{permission_view}}"]
    }
  },
  "valid_payload": {
    "_comment": "Replace with valid payload that satisfies the create DTO (from api.md リクエストパラメータ)"
  },
  "invalid_payloads": [
    { "case": "missing_required_field", "payload": {}, "expected_error_code": "VALIDATION_ERROR" },
    { "case": "max_length_exceeded", "payload": {}, "expected_error_code": "VALIDATION_ERROR" }
  ],
  "seed_records": [
    { "_comment": "Replace with one or more rows owned by ja_id=2 (for CHUOKAI DataScope tests)" }
  ]
}
