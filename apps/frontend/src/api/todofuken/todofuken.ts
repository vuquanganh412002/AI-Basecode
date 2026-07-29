import axiosInstance from '@/api/axios-instance';

/** GET /api/v1/todofuken が返す都道府県の1行。 */
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
