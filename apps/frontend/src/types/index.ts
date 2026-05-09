export interface User {
  account_id: number;
  login_id: string;
  account_name: string;
  role_id: number;
  role_code: string;
  role_name: string;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  todofuken_code: string | null;
  paper_flg: boolean;
  denshi_flg: boolean;
  email: string;
  /** MFA on/off — controls whether the user must enter a 6-digit OTP at login. */
  mfa_enable_flg: boolean;
  permissions: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface ApiError {
  error_code: string;
  message: string;
  errors?: { field: string; message: string }[];
}
