import axiosInstance from '@/api/axios-instance';

export interface CodeItem {
  value: number | string;
  label: string;
  label_short: string;
}

export type CodeMap = Record<string, CodeItem[]>;

export interface GetCodesResponse {
  data: CodeMap;
}

export async function getCodes(): Promise<CodeMap> {
  const res = await axiosInstance.get<GetCodesResponse>('/api/v1/codes');
  return res.data.data;
}

export async function getCodesByCategory(category: string): Promise<CodeItem[]> {
  const res = await axiosInstance.get<{ data: CodeItem[] }>(
    `/api/v1/codes/${encodeURIComponent(category)}`,
  );
  return res.data.data;
}
