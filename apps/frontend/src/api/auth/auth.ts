import axiosInstance from '@/api/axios-instance';
import type { User } from '@/types';

export interface LoginRequest {
  login_id: string;
  password: string;
}

export type LoginResponse =
  | {
      data: {
        mfa_required: false;
        access_token: string;
        user: User;
      };
    }
  | {
      data: {
        mfa_required: true;
        mfa_token: string;
        expires_in: number;
      };
    };

export interface MfaVerifyRequest {
  mfa_token: string;
  otp_code: string;
}

export interface MfaVerifyResponse {
  data: {
    access_token: string;
    user: User;
  };
}

export interface MfaResendResponse {
  data: {
    mfa_token: string;
    expires_in: number;
    resend_count: number;
    max_resend: number;
  };
}

export interface RefreshResponse {
  data: {
    access_token: string;
    user: User;
  };
}

export interface PublicOshiraseItem {
  oshirase_id: number;
  oshirase_type: number;
  oshirase_type_label: string;
  title: string;
  publish_start_date: string;
}

export async function login(body: LoginRequest): Promise<LoginResponse['data']> {
  const res = await axiosInstance.post<LoginResponse>('/api/v1/auth/login', body);
  return res.data.data;
}

export async function verifyMfa(body: MfaVerifyRequest): Promise<MfaVerifyResponse['data']> {
  const res = await axiosInstance.post<MfaVerifyResponse>('/api/v1/auth/mfa/verify', body);
  return res.data.data;
}

export async function resendMfa(mfaToken: string): Promise<MfaResendResponse['data']> {
  const res = await axiosInstance.post<MfaResendResponse>('/api/v1/auth/mfa/resend', {
    mfa_token: mfaToken,
  });
  return res.data.data;
}

export async function refresh(): Promise<RefreshResponse['data']> {
  const res = await axiosInstance.post<RefreshResponse>('/api/v1/auth/refresh');
  return res.data.data;
}

export async function logout(): Promise<void> {
  await axiosInstance.post('/api/v1/auth/logout');
}

export async function fetchPublicOshirase(
  publishLocation = 1,
  limit = 10,
): Promise<PublicOshiraseItem[]> {
  const res = await axiosInstance.get<{ data: PublicOshiraseItem[] }>(
    '/api/v1/oshirase/public',
    { params: { publish_location: publishLocation, limit } },
  );
  return res.data.data;
}
