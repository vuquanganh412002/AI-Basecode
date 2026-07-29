/**
 * API バージョンプレフィックス — main.ts の `app.setGlobalPrefix()` で付与
 * （createIntegrationTestApp も同様）。controller は無プレフィックスパスを宣言し
 * Nest がルーティング時に前置。health は `GET /api/v1/health` で AWS ECS/ALB の
 * ヘルスチェックが解決。`v1`→`v2` はこのファイル＋FE baseUrl のみ変更。
 */
export const API_PREFIX = 'api/v1';
