import { computed } from 'vue';
import { useRoute } from 'vue-router';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/**
 * Generates breadcrumbs from the current route's matched chain,
 * reading `meta.breadcrumb` (string | BreadcrumbItem[]).
 *
 * Usage in route meta:
 * ```ts
 * { path: '/tanka', meta: { breadcrumb: 'マスタ管理' } }
 * { path: '/tanka/list', meta: { breadcrumb: '単価マスタ明細検索' } }
 * ```
 *
 * Result: `ホーム > マスタ管理 > 単価マスタ明細検索`
 */
export function useBreadcrumb() {
  const route = useRoute();

  const items = computed<BreadcrumbItem[]>(() => {
    const list: BreadcrumbItem[] = [{ label: 'ホーム', to: '/' }];
    for (const m of route.matched) {
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
  });

  return { items };
}
