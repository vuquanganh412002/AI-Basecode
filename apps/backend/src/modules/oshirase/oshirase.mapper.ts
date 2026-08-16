// ACSMS-SCR-031 管理エンドポイント用の純粋な entity → response DTO マッパー。
// Nest DI / repo / service なし — どこからでも import 可。
//
// [no-labels-policy] 認証エンドポイントは `*_label` を返さない
// （`.claude/rules/nestjs.md §Response serialization`）。ラベルは FE が
// m_code キャッシュから `useCodesStore().label('CATEGORY', value)` で解決。
// 顧客が編集した m_code ラベルが FE 再デプロイなしで反映され、API 応答も
// 小さく安定した契約に保たれる。

import type { Oshirase } from '@/database/entities/oshirase.entity';
import { formatDateTimeMinutesJst } from '@/common/utils/datetime';

export interface OshiraseListItem {
  oshirase_id: number;
  ja_id: number | null;
  // [ja-name-join] OshiraseService.getList の leftJoin で m_ja から解決。
  // ja_id が null（= 全JA向け）または参照先 JA が物理削除済みなら null。
  // FE は null を表セルで '全JA向け' と描画。
  ja_name: string | null;
  oshirase_type: number;
  publish_location: number;
  status: number;
  title: string;
  publish_start_date: string;
  publish_end_date: string | null;
  target_kanri_kubun: string;
  created_at: string;
  updated_at: string;
}

export interface OshiraseDetail extends OshiraseListItem {
  content: string;
}

export function toOshiraseListItem(
  o: Oshirase,
  jaName: string | null = null,
): OshiraseListItem {
  return {
    oshirase_id: Number(o.oshiraseId),
    ja_id: o.jaId === null ? null : Number(o.jaId),
    ja_name: jaName,
    oshirase_type: o.oshiraseType,
    publish_location: o.publishLocation,
    status: o.status,
    title: o.title,
    publish_start_date: formatDateTimeMinutesJst(o.publishStartDate),
    publish_end_date: o.publishEndDate ? formatDateTimeMinutesJst(o.publishEndDate) : null,
    target_kanri_kubun: o.targetKanriKubun ?? '',
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  };
}

export function toOshiraseDetail(
  o: Oshirase,
  jaName: string | null = null,
): OshiraseDetail {
  return {
    ...toOshiraseListItem(o, jaName),
    content: o.content,
  };
}

