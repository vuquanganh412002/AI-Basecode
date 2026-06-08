import axiosInstance from '@/api/axios-instance';

/** Single 都道府県 row returned by GET /api/v1/todofuken. */
export interface TodofukenItem {
  todofuken_code: string;
  todofuken_name: string;
}

export interface TodofukenListEnvelope {
  data: TodofukenItem[];
}

export async function getTodofukenList(): Promise<TodofukenListEnvelope> {
  const res = await axiosInstance.get<TodofukenListEnvelope>('/api/v1/todofuken');
  return res.data;
}
