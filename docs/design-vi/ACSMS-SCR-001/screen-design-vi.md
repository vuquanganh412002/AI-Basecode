---
documentType: Screen Design
projectName: Cloud Subscriber Management System
systemName: クラウド版購読者管理システム
screenId: SCR-LOGIN-001
screenName: Màn hình Đăng nhập (ログイン画面)
status: Draft
creationDate: 2026-03-11
version: 1.0.0
lastModified: 2026-03-11
---

# Screen Design — Màn hình Đăng nhập (ログイン画面)

> Reference: `docs/design/login/stick/screen.png`, `docs/design/login/stick/code.html`

## 1. Tổng Quan

| Mục | Nội dung |
|---|---|
| Screen ID | SCR-LOGIN-001 |
| Tên màn hình (JP) | ログイン画面 |
| Tên màn hình (VI) | Màn hình Đăng nhập |
| URL | `/login` |
| Loại | Public (không yêu cầu xác thực) |
| Mục đích | Xác thực người dùng để truy cập hệ thống |

## 2. Layout Tổng Thể

```
┌──────────────────────────────────────────────┐
│                                              │
│              日本情報新聞                      │
│       クラウド版購読者管理システム                │
│                                              │
│   ┌──────────────────────────────────┐       │
│   │         LOGIN FORM               │       │
│   │                                  │       │
│   │  ユーザーID                       │       │
│   │  ┌─👤─────────────────────────┐  │       │
│   │  │ IDを入力してください        │  │       │
│   │  └────────────────────────────┘  │       │
│   │                                  │       │
│   │  パスワード                       │       │
│   │  ┌─🔒─────────────────────────┐  │       │
│   │  │ パスワードを入力してください │  │       │
│   │  └────────────────────────────┘  │       │
│   │                                  │       │
│   │  ┌────────────────────────────┐  │       │
│   │  │         ログイン            │  │       │
│   │  └────────────────────────────┘  │       │
│   │                                  │       │
│   │  ログインすることで利用規約に     │       │
│   │  同意したものとみなされます。     │       │
│   └──────────────────────────────────┘       │
│                                              │
│   ┌──────────────────────────────────┐       │
│   │ 📢 お知らせ                      │       │
│   │──────────────────────────────────│       │
│   │ 2024.05.15  利用規約を改訂...    │       │
│   │ 2024.04.01  システムメンテ...    │       │
│   └──────────────────────────────────┘       │
│                                              │
│   ┌──────────────────────────────────┐       │
│   │ 🎧 お問い合わせ先                │       │
│   │    日本情報新聞 協同事業局業務管理部│      │
│   │    03-6281-5808 (平日 9:30〜17:30)│      │
│   └──────────────────────────────────┘       │
│                                              │
│  © 2026 Japan Information Newspaper      [🌓]│
└──────────────────────────────────────────────┘
```

## 3. Chi Tiết Thành Phần

### 3.1 Header

| Thành phần | Nội dung | Style |
|---|---|---|
| Tên công ty | 日本情報新聞 | `text-2xl font-bold`, màu `text-main` |
| Tên hệ thống | クラウド版購読者管理システム | `text-sm`, màu `text-secondary` |

### 3.2 Form Đăng Nhập (Login Card)

| Thành phần | Type | Chi tiết |
|---|---|---|
| Container | Card | `max-w-[400px]`, background `white`, border-radius `6px`, shadow `ant-card` |

#### 3.2.1 Trường nhập liệu

| Field | Label (JP) | Type | Placeholder | Icon | Validation |
|---|---|---|---|---|---|
| User ID | ユーザーID | `text` | IDを入力してください | `person` | Bắt buộc |
| Password | パスワード | `password` | パスワードを入力してください | `lock` | Bắt buộc |

**Input Style:**
- Container: `ant-input-wrapper` — border `#d9d9d9`, border-radius `6px`
- Focus state: border chuyển thành `#1677ff`, ring `primary/20`
- Icon: Material Symbols Outlined, size `20px`, color `rgba(0,0,0,0.45)`

#### 3.2.2 Nút Đăng nhập

| Thuộc tính | Giá trị |
|---|---|
| Text | ログイン |
| Style | `w-full`, background `#1677ff`, hover `#4096ff`, text `white`, font-weight `medium` |
| Border-radius | `6px` |
| Padding | `py-2.5` |

#### 3.2.3 Link Lợi Dụng Quy Ước

| Thuộc tính | Giá trị |
|---|---|
| Text | ログインすることで[利用規約]に同意したものとみなされます。 |
| Link style | `text-primary`, underline, hover `text-primary-hover` |
| Action | Mở file PDF quy định sử dụng |

### 3.3 Khu Vực Thông Báo (お知らせ)

| Thuộc tính | Giá trị |
|---|---|
| Header | `お知らせ` với icon `campaign` |
| Header style | Background `gray-50/50`, border-bottom, text `uppercase tracking-wider` |
| Nội dung | Danh sách thông báo với format: `[YYYY.MM.DD]  [Nội dung]` |
| Nguồn dữ liệu | API: `GET /api/notifications` (public endpoint) |

### 3.4 Khu Vực Liên Hệ (お問い合わせ先)

| Thuộc tính | Giá trị |
|---|---|
| Icon | `headset_mic` trong vòng tròn `bg-blue-50` |
| Tên bộ phận | 日本情報新聞 協同事業局業務管理部 |
| Số điện thoại | `03-6281-5808` — `text-base font-bold` |
| Giờ làm việc | 平日 9:30〜17:30 |

### 3.5 Footer

| Thuộc tính | Giá trị |
|---|---|
| Copyright | © 2026 Japan Information Newspaper All Rights Reserved. |
| Style | `text-[11px]`, màu `text-secondary` |

### 3.6 Nút Dark Mode

| Thuộc tính | Giá trị |
|---|---|
| Vị trí | Fixed, bottom-right (`bottom-6 right-6`) |
| Icon | `contrast` (Material Symbols) |
| Style | Vòng tròn `w-10 h-10`, background `white`, shadow, border |
| Action | Toggle class `dark` trên `<html>` |

## 4. Hành Vi (Behavior)

### 4.1 Luồng Đăng Nhập

```
[Nhập User ID + Password] → [Click ログイン]
    ├── Thành công → Redirect đến メニュー画面 (/menu)
    └── Thất bại → Hiển thị thông báo lỗi
```

### 4.2 Xử Lý Lỗi

| Trường hợp | Message | Hiển thị |
|---|---|---|
| Chưa nhập User ID | ユーザーIDを入力してください | Dưới field User ID |
| Chưa nhập Password | パスワードを入力してください | Dưới field Password |
| Sai thông tin đăng nhập | ユーザーIDまたはパスワードが正しくありません | `a-alert type="error"` phía trên form |
| Tài khoản bị khóa | アカウントが無効です。管理者にお問い合わせください。 | `a-alert type="error"` phía trên form |
| Lỗi hệ thống | システムエラーが発生しました。しばらくしてから再度お試しください。 | `a-alert type="error"` phía trên form |

### 4.3 Dark Mode

- Toggle giữa Light/Dark theme
- Dark mode: background `slate-950`, card `slate-900`, border `slate-800`
- Transition mượt: `transition-colors duration-200`

## 5. API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Xác thực đăng nhập |
| `GET` | `/api/notifications/public` | Lấy danh sách thông báo công khai |

### 5.1 Request — POST /api/auth/login

```json
{
  "userId": "string",
  "password": "string"
}
```

### 5.2 Response — Thành công (200)

```json
{
  "accessToken": "string (JWT)",
  "user": {
    "id": "number",
    "userId": "string",
    "userName": "string",
    "adminType": "number (1-4)"
  }
}
```

### 5.3 Response — Thất bại (401)

```json
{
  "statusCode": 401,
  "message": "ユーザーIDまたはパスワードが正しくありません",
  "error": "Unauthorized"
}
```

## 6. Design Tokens

| Token | Giá trị | Mô tả |
|---|---|---|
| `primary` | `#1677ff` | Ant Design Primary Blue |
| `primary-hover` | `#4096ff` | Hover state |
| `bg-layout` | `#f5f5f5` | Background chính |
| `border-base` | `#d9d9d9` | Border mặc định |
| `text-main` | `rgba(0,0,0,0.88)` | Text chính |
| `text-secondary` | `rgba(0,0,0,0.45)` | Text phụ |
| Font | Noto Sans JP | 400, 500, 700 |
| Border-radius | `6px` | Ant Design standard |

## 7. Responsive

| Breakpoint | Hành vi |
|---|---|
| Desktop (>768px) | Card login căn giữa, max-width `400px` |
| Mobile (<768px) | Card login full-width với padding `px-4` |

## 8. Accessibility

- Tất cả input có `<label>` tương ứng
- Focus state rõ ràng với ring effect
- Dark mode hỗ trợ contrast đủ tiêu chuẩn WCAG AA
- Nút login có thể kích hoạt bằng phím Enter

→ See `docs/design/basic-design.md` Section 2.1 cho business rules
→ See `docs/design/login/stick/code.html` cho reference implementation
