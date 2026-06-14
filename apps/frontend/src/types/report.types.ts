// Re-export the report request/response shapes from the hand-written API
// wrapper so views/components import types from one place without
// duplicating the BE-mirrored contract.
export type {
  MeiboReportQuery,
  MeiboPreviewData,
  MeiboPreviewEnvelope,
  HanbaitenGroup,
  KanriShitenSubGroup,
  HanbaitenReportRow,
  KanriShitenGroup,
  KanriShitenReportRow,
} from '@/api/report/report';
