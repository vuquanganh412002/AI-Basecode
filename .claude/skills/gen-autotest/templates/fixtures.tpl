{
  "screen_id": "{{SCREEN_ID}}",
  "screen_name": "{{SCREEN_NAME}}",
  "users": {
    "admin": {
      "login_id": "admin01",
      "password": "TestPassword123",
      "role_code": "NICHINO_ADMIN",
      "ja_id": null,
      "permissions": ["{{permission_view}}", "{{permission_create}}", "{{permission_update}}", "{{permission_delete}}"]
    },
    "chuokai": {
      "login_id": "chuokai01",
      "password": "TestPassword123",
      "role_code": "CHUOKAI",
      "ja_id": 2,
      "permissions": ["{{permission_view}}"]
    },
    "ja_honten": {
      "login_id": "ja_honten01",
      "password": "TestPassword123",
      "role_code": "JA_HONTEN",
      "ja_id": 3,
      "permissions": ["{{permission_view}}", "{{permission_update}}"]
    }
  },
  "valid_payload": {
    "_": "Replace with valid payload that satisfies create DTO"
  },
  "invalid_payloads": [
    { "case": "missing_required_field", "payload": {}, "expected_error_code": "VALIDATION_ERROR" },
    { "case": "max_length_exceeded", "payload": {}, "expected_error_code": "VALIDATION_ERROR" }
  ],
  "seed_records": [
    { "_": "Replace with one or more rows owned by ja_id=2 (for CHUOKAI scope tests)" }
  ]
}
