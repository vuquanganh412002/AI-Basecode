/**
 * Design tokens — single source of truth for the project's visual
 * language. Both Ant Design Vue (via ConfigProvider in App.vue) and
 * Tailwind v4 (via @theme in src/styles/tailwind.css) must agree
 * with the values defined here.
 *
 * Why this file exists:
 *   - AntD components read their theme from JS (ConfigProvider).
 *   - Tailwind v4 reads its theme from CSS (@theme block).
 *   - We can't import TS values into CSS, so the same numbers/colors
 *     have to appear in two places. This file is the canonical copy;
 *     when you change a value here, mirror it in tailwind.css.
 *
 * Color palette is Ant Design v5's default semantic palette, chosen
 * because it's the de-facto standard for Japanese enterprise web
 * (青=情報, 緑=成功, 黄=警告, 赤=エラー).
 *
 * To recolor the entire app for a new client, change the values here
 * AND mirror them in src/styles/tailwind.css. No template files need
 * to be touched — every screen reads from these tokens.
 */

export const designTokens = {
  /* ── Brand & semantic colors ─────────────────────────────────────── */
  colors: {
    /** Primary action color (button type="primary", links, focus rings). */
    primary: '#1677ff',
    /** Hover/active shade of primary. */
    primaryHover: '#4096ff',

    /** Default form-input border color (matches AntD v5). */
    borderBase: '#d9d9d9',

    /** Status palette — matches AntD v5 defaults. */
    success: '#52c41a', // 成功 - save, complete
    successHover: '#389e0d',
    warning: '#faad14', // 警告 - confirm
    warningHover: '#d48806',
    error: '#ff4d4f', // エラー - delete, validation
    errorHover: '#d9363e',
    info: '#1677ff', // 情報 - notice
    infoHover: '#4096ff',
  },

  /* ── Text color hierarchy (alpha-based, flips for dark mode) ─────
     Matches Ant Design v5's text-token ladder:
        main        ↔ AntD `colorText`            (body, headings)
        description ↔ AntD `colorTextSecondary`   (form labels, help)
        secondary   ↔ AntD `colorTextTertiary`    (captions, fine print)
        disabled    ↔ AntD `colorTextQuaternary`  (disabled state) */
  text: {
    light: {
      main: 'rgba(0, 0, 0, 0.88)',
      description: 'rgba(0, 0, 0, 0.65)',
      secondary: 'rgba(0, 0, 0, 0.45)',
      disabled: 'rgba(0, 0, 0, 0.25)',
    },
    dark: {
      main: 'rgba(255, 255, 255, 0.88)',
      description: 'rgba(255, 255, 255, 0.7)',
      secondary: 'rgba(255, 255, 255, 0.55)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },
  },

  /* ── Surfaces (background colors) ────────────────────────────────
        layout      page background (under cards)
        card        primary surface — content cards, modals, sidebars
        cardSubtle  secondary surface — card header bars, banners
        hover       hover state for clickable rows / list items
        active      selected/active row (typically primary tint) */
  surfaces: {
    light: {
      layout: '#f5f5f5',
      card: '#ffffff',
      cardSubtle: '#f8fafc', // slate-50
      hover: '#f1f5f9', // slate-100
      active: 'rgba(22, 119, 255, 0.1)', // primary/10
    },
    dark: {
      layout: '#020617', // slate-950
      card: '#0f172a', // slate-900
      cardSubtle: 'rgba(30, 41, 59, 0.3)', // slate-800/30
      hover: '#1e293b', // slate-800
      active: 'rgba(22, 119, 255, 0.15)',
    },
  },

  /* ── Borders / dividers ──────────────────────────────────────────
        default  card / page-section borders
        strong   form-input borders, table cell borders */
  borders: {
    light: {
      default: '#e2e8f0', // slate-200
      strong: '#cbd5e1', // slate-300
    },
    dark: {
      default: '#1e293b', // slate-800
      strong: '#334155', // slate-700
    },
  },

  /* ── Status background tints (for alert badges, banners) ─────────
     E.g. `bg-error-subtle text-error` for the 承認待ちあり badge. */
  statusSubtle: {
    light: {
      success: 'rgba(82, 196, 26, 0.1)',
      warning: 'rgba(250, 173, 20, 0.1)',
      error: 'rgba(255, 77, 79, 0.1)',
      info: 'rgba(22, 119, 255, 0.1)',
    },
    dark: {
      success: 'rgba(82, 196, 26, 0.2)',
      warning: 'rgba(250, 173, 20, 0.2)',
      error: 'rgba(255, 77, 79, 0.2)',
      info: 'rgba(22, 119, 255, 0.2)',
    },
  },

  /* ── Icon color (sidebar nav, dashboard menu cards, etc.) ───────── */
  icon: {
    light: '#64748b', // slate-500
    dark: '#94a3b8', // slate-400
  },

  /* ── Typography ──────────────────────────────────────────────────── */
  font: {
    /** Base font stack — Noto Sans JP first for full kanji/kana glyphs. */
    display: "'Noto Sans JP', Inter, sans-serif",
  },

  /* ── Shape ───────────────────────────────────────────────────────── */
  radius: {
    /** Default corner rounding for cards, inputs, buttons (matches AntD). */
    ant: 6,
  },

  /* ── Elevation ───────────────────────────────────────────────────── */
  shadow: {
    /** Card / popover shadow — AntD's default. */
    antCard:
      '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
  },
} as const;
