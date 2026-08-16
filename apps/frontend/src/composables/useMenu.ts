import { computed, type ComputedRef } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import {
  MENU_SECTIONS,
  type MenuItem,
  type MenuSection,
} from '@/constants/menu-sections';
import { RoleCode } from '@/constants/enums';

/** メニュー項目 + `useMenu()` が算出する実行時 `disabled` 状態。 */
export interface VisibleMenuItem extends MenuItem {
  /**
   * 権限は保持（無ければ項目自体が除外される）だが、アカウントに無い
   * 購読種別フラグを要する → グレーアウト + 非クリック（account_concept.md §139-145）。
   */
  disabled?: boolean;
}

/** 算出済み `disabled` フラグを持つ項目のメニューセクション。 */
export interface VisibleMenuSection extends Omit<MenuSection, 'items'> {
  items: VisibleMenuItem[];
}

/**
 * NICHINO_STAFF は 販売店 画面を JA の代行入力モードで操作する。代行中と分かる
 * よう label に接尾辞を付与 — 販売店情報登録（代行）/ 販売店明細検索（代行）。
 * route 名でキーし、staff のみ・該当項目のみ付与。他ロールは素の label。
 * （2026-06 に MENU_SECTIONS から除去した旧 販売店代行入力 メニュー項目の代替。）
 */
const STAFF_DAIKO_LABEL_SUFFIX = '（代行）';
const STAFF_DAIKO_ROUTE_NAMES: ReadonlySet<string> = new Set([
  'HanbaitenCreate',
  'HanbaitenList',
]);

/**
 * 制限②（顧客要件 2026-07）— 所属支店(shiten_id)が設定されたアカウントは
 * 帳票5画面を使用できない。BE 側は ShitenRestrictedGuard で 403 を返す。
 * FE ではメニューを「非表示」ではなく「表示のうえ非活性(グレーアウト)」に
 * する — 権限(ロール)自体は保持しているため、機能の存在は見せつつ所属支店
 * 設定により今は使えないことを示す（購読種別フラグの非活性と同じ扱い）。
 *   - 口座振替データ出力 (ACSMS-SCR-020)
 *   - 配達手数料支払情報出力 (ACSMS-SCR-021)
 *   - 購読者名簿 (ACSMS-SCR-026)
 *   - 増減連絡票（販売店）(ACSMS-SCR-028)
 *   - 増減通知（日本農業新聞）(ACSMS-SCR-029)
 */
const SHITEN_RESTRICTED_ROUTE_NAMES: ReadonlySet<string> = new Set([
  'KozaFurikaeExport',
  'HaitatsuryoExport',
  'ReportMeibo',
  'ReportZougenHanbaiten',
  'ReportZougenNichino',
]);

export interface UseMenuOptions {
  /**
   * ルート無しの最上位項目（Dashboard の「メニュー画面」項目）を結果から除外。
   * DashboardView は true を設定し、ダッシュボード上で「ダッシュボードへ」
   * カードを描画しないようにする。
   */
  excludeRoot?: boolean;
}

/**
 * 現ユーザーが閲覧許可されたメニューセクションを、`src/constants/menu-sections.ts`
 * 定義の標準順で返す。項目は `permission` 無し（例 Dashboard）か、セッションの
 * permissions[] が必要権限を含む時に表示。空セクション（全項目除外）は
 * 自動折り畳みで除去。
 *
 * AppSidebar（左レール）と DashboardView（ACSMS-SCR-010 メニューカード）両方で使用し
 * 二面を同期。
 */
export function useMenu(options: UseMenuOptions = {}): {
  visibleSections: ComputedRef<VisibleMenuSection[]>;
} {
  const authStore = useAuthStore();

  const visibleSections = computed<VisibleMenuSection[]>(() => {
    const isStaff = authStore.user?.role_code === RoleCode.NICHINO_STAFF;
    // 紙版・電子版いずれの取扱い権限も無いアカウントは購読者の登録/取込/
    // 一括置換ができない → 該当メニューを非活性化 (account_concept.md §139-145)。
    const hasAnyDokusyaFlag =
      !!authStore.user?.paper_flg || !!authStore.user?.denshi_flg;
    // 制限② — 所属支店が設定されたアカウントは帳票5画面のメニューを非表示。
    const isShitenRestricted = authStore.user?.shiten_id != null;
    return MENU_SECTIONS
      .filter((section) => !options.excludeRoot || section.heading !== undefined)
      .map((section) => ({
        ...section,
        items: section.items
          .filter((it) => !it.permission || authStore.hasPermission(it.permission))
          .map((it): VisibleMenuItem => {
            const label =
              isStaff && STAFF_DAIKO_ROUTE_NAMES.has(it.name)
                ? it.label + STAFF_DAIKO_LABEL_SUFFIX
                : it.label;
            const disabled =
              (it.requiresAnyDokusyaFlag === true && !hasAnyDokusyaFlag) ||
              (isShitenRestricted && SHITEN_RESTRICTED_ROUTE_NAMES.has(it.name));
            return { ...it, label, disabled };
          }),
      }))
      .filter((section) => section.items.length > 0);
  });

  return { visibleSections };
}
