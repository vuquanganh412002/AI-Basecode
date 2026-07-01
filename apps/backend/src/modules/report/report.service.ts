import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { SessionPayload } from '@/modules/auth/session.service';

import { MeiboReportQueryDto } from './dto/meibo-report-query.dto';
import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ZougenNichinoQueryDto } from './dto/zougen-nichino-query.dto';
import {
  MeiboReportService,
  type ExportMeiboResult,
} from './meibo-report.service';
import {
  ZougenReportService,
  type ExportZougenResult,
  type ExportZougenNichinoResult,
} from './zougen-report.service';
import type { MeiboPreviewData } from './report.mapper';
import type { ZougenPreviewData } from './zougen.mapper';
import type { ZougenNichinoPreviewData } from './zougen-nichino.mapper';

// 出力結果の型は各サブサービスから再エクスポートする（controller / 既存テストが
// ReportService 経由で参照できるよう、ファサードの公開シグネチャを不変に保つ）。
export type {
  ExportMeiboResult,
  ExportZougenResult,
  ExportZougenNichinoResult,
};

/**
 * 帳票出力のファサード。SCR-026（購読者名簿）は {@link MeiboReportService}、
 * SCR-028（増減連絡票）/ SCR-029（増減通知）は {@link ZougenReportService} に
 * 委譲する。controller は引き続き ReportService のみを inject する。
 */
@Injectable()
export class ReportService {
  constructor(
    private readonly meibo: MeiboReportService,
    private readonly zougen: ZougenReportService,
  ) {}

  // ─── ACSMS-API-026-001 — GET /api/v1/report/meibo/preview ────────
  previewMeibo(
    query: MeiboReportQueryDto,
    session: SessionPayload,
  ): Promise<MeiboPreviewData> {
    return this.meibo.previewMeibo(query, session);
  }

  // ─── ACSMS-API-026-002 — GET /api/v1/report/meibo/export ─────────
  exportMeiboExcel(
    query: MeiboReportQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportMeiboResult> {
    return this.meibo.exportMeiboExcel(query, session, req);
  }

  // ─── ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview ──
  previewZougenHanbaiten(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
  ): Promise<ZougenPreviewData> {
    return this.zougen.previewZougenHanbaiten(query, session);
  }

  // ─── ACSMS-API-028-002 — POST /api/v1/report/zougen-hanbaiten/export ──
  exportZougenHanbaitenPdf(
    query: ZougenHanbaitenQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenResult> {
    return this.zougen.exportZougenHanbaitenPdf(query, session, req);
  }

  // ─── ACSMS-API-029-001 — GET /api/v1/report/zougen-nichino/preview ────
  previewZougenNichino(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
  ): Promise<ZougenNichinoPreviewData> {
    return this.zougen.previewZougenNichino(query, session);
  }

  // ─── ACSMS-API-029-002 — POST /api/v1/report/zougen-nichino/export ────
  exportZougenNichinoPdf(
    query: ZougenNichinoQueryDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ExportZougenNichinoResult> {
    return this.zougen.exportZougenNichinoPdf(query, session, req);
  }
}
