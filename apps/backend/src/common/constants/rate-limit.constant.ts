/**
 * ファイルアップロード/ダウンロード系エンドポイント専用のレート制限。
 *
 * これらのパスは大バイナリ/大きめの free-text body を運ぶため WAF の
 * body-inspection bypass 対象（`.claude/rules/nestjs.md` §WAF body-inspection
 * bypass）— edge (CloudFront WAF) の managed rate-limit ルールを失うので、
 * app 側でグローバル既定（100/min, app.module.ts）より厳格化する。
 */
export const UPLOAD_DOWNLOAD_THROTTLE = {
  default: { limit: 20, ttl: 60000 },
} as const;
