import { computed } from 'vue';
import {
  useRoute,
  type RouteLocationMatched,
  type RouteLocationRaw,
} from 'vue-router';

export interface BreadcrumbItem {
  label: string;
  /** 文字列パス、または Vue Router location オブジェクト（`{ name: 'JaList' }`）。
   *  パス改名が波及しないよう named-route オブジェクト形式を推奨。 */
  to?: RouteLocationRaw;
}

/**
 * 純粋ビルダー: route の `matched` チェーンをパンくず項目へ変換（常に ホーム 接頭）。
 * {@link useBreadcrumb}（コンポーネント文脈）と router `afterEach` の
 * document-title ロジックで共有し、両者が同一ソースからページラベルを導出しドリフトを防ぐ。
 */
export function buildBreadcrumbItems(
  matched: readonly RouteLocationMatched[],
): BreadcrumbItem[] {
  const list: BreadcrumbItem[] = [{ label: 'ホーム', to: { name: 'Dashboard' } }];
  for (const m of matched) {
    const raw = m.meta?.breadcrumb as
      | string
      | BreadcrumbItem
      | BreadcrumbItem[]
      | undefined;
    if (!raw) continue;
    if (typeof raw === 'string') {
      list.push({ label: raw, to: m.path });
    } else if (Array.isArray(raw)) {
      list.push(...raw);
    } else {
      list.push(raw);
    }
  }
  return list;
}

/**
 * 現ページのタイトル = 末端（最後）のパンくずラベル。route が ホーム のみに
 * 解決する（ページ固有パンくず無し）場合は `null`。ページ毎の `document.title` 構築に使用。
 */
export function pageTitleFromMatched(
  matched: readonly RouteLocationMatched[],
): string | null {
  const items = buildBreadcrumbItems(matched);
  // items[0] は常に ホーム — 実ページは最低 1 つ追加する。
  return items.length > 1 ? (items.at(-1)?.label ?? null) : null;
}

/**
 * 現 route の matched チェーンから `meta.breadcrumb`（string | BreadcrumbItem[]）を
 * 読んでパンくずを生成。
 *
 * route meta での使用例:
 * ```ts
 * { path: '/tanka', meta: { breadcrumb: 'マスタ管理' } }
 * { path: '/tanka/list', meta: { breadcrumb: '単価マスタ明細検索' } }
 * ```
 *
 * 結果: `ホーム > マスタ管理 > 単価マスタ明細検索`
 */
export function useBreadcrumb() {
  const route = useRoute();
  const items = computed<BreadcrumbItem[]>(() =>
    buildBreadcrumbItems(route.matched),
  );
  return { items };
}
