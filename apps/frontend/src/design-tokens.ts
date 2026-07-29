/**
 * デザイントークン — プロジェクトのビジュアル言語の単一ソース。
 * Ant Design Vue（App.vue の ConfigProvider 経由）と Tailwind v4
 * （src/styles/tailwind.css の @theme 経由）の両方がここの値と一致する必要がある。
 *
 * このファイルの存在理由:
 *   - AntD コンポーネントはテーマを JS（ConfigProvider）から読む。
 *   - Tailwind v4 はテーマを CSS（@theme ブロック）から読む。
 *   - TS の値を CSS に import できないため、同じ数値/色が2箇所に現れる。
 *     ここが正本で、値を変えたら tailwind.css にも反映する。
 *
 * カラーパレットは Ant Design v5 の既定セマンティックパレット。日本の
 * エンタープライズ web の事実上の標準のため採用（青=情報, 緑=成功, 黄=警告, 赤=エラー）。
 *
 * 新規クライアント向けにアプリ全体を配色し直すには、ここの値を変更し
 * src/styles/tailwind.css にも反映する。全画面がこのトークンを読むため、
 * template ファイルには触れる必要がない。
 */

export const designTokens = {
  /* ── ブランド & セマンティックカラー ─────────────────────────────────────── */
  colors: {
    /** 主要アクションの色（button type="primary"、リンク、focus リング）。 */
    primary: '#1677ff',
    /** primary の hover/active の色味。 */
    primaryHover: '#4096ff',

    /** フォーム入力の既定ボーダー色（AntD v5 準拠）。 */
    borderBase: '#d9d9d9',

    /** ステータスパレット — AntD v5 既定準拠。 */
    success: '#52c41a', // 成功 - 保存, 完了
    successHover: '#389e0d',
    warning: '#faad14', // 警告 - 確認
    warningHover: '#d48806',
    error: '#ff4d4f', // エラー - 削除, バリデーション
    errorHover: '#d9363e',
    info: '#1677ff', // 情報 - お知らせ
    infoHover: '#4096ff',
  },

  /* ── テキスト色の階層（アルファ値ベース・ダークモードで反転） ─────
     Ant Design v5 のテキストトークン階層に一致:
        main        ↔ AntD `colorText`            (本文, 見出し)
        description ↔ AntD `colorTextSecondary`   (フォームラベル, ヘルプ)
        secondary   ↔ AntD `colorTextTertiary`    (キャプション, 細字)
        disabled    ↔ AntD `colorTextQuaternary`  (無効状態) */
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

  /* ── サーフェス（背景色） ────────────────────────────────
        layout      ページ背景（カードの下）
        card        主サーフェス — コンテンツカード, モーダル, サイドバー
        cardSubtle  副サーフェス — カードヘッダバー, バナー
        hover       クリック可能な行 / リスト項目の hover 状態
        active      選択/アクティブ行（通常 primary の淡色） */
  surfaces: {
    light: {
      layout: '#f5f5f5',
      card: '#ffffff',
      cardSubtle: '#f8fafc', // slate-50
      hover: '#f1f5f9', // slate-100
      active: 'rgba(22, 119, 255, 0.1)', // primary/10
      // disabled / readonly な入力欄・表示欄の統一背景（AntD colorBgContainerDisabled
      // + カスタム readonly div の両方が参照する）。
      disabled: '#f5f5f5', // slate-100 相当（AntD 既定の無効背景に近い）
    },
    dark: {
      layout: '#020617', // slate-950
      card: '#0f172a', // slate-900
      cardSubtle: 'rgba(30, 41, 59, 0.3)', // slate-800/30
      hover: '#1e293b', // slate-800
      active: 'rgba(22, 119, 255, 0.15)',
      disabled: '#1e293b', // slate-800（履歴No 等の無効入力と同色に統一）
    },
  },

  /* ── ボーダー / 区切り線 ──────────────────────────────────────────
        default  カード / ページセクションのボーダー
        strong   フォーム入力のボーダー, テーブルセルのボーダー */
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

  /* ── ステータス背景の淡色（アラートバッジ, バナー用） ─────────
     例: 承認待ちあり バッジの `bg-error-subtle text-error`。 */
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

  /* ── アイコン色（サイドバーナビ, ダッシュボードメニューカード等） ───────── */
  icon: {
    light: '#64748b', // slate-500
    dark: '#94a3b8', // slate-400
  },

  /* ── タイポグラフィ ──────────────────────────────────────────────────── */
  font: {
    /** ベースフォントスタック — 漢字/かなグリフのため Noto Sans JP を先頭に。 */
    display: "'Noto Sans JP', Inter, sans-serif",
  },

  /* ── xs 未満のフォントサイズ ──────────────────────────────────────────────
     Tailwind の `text-xs` は下限 12px。連絡先カードの補足, フッターの
     マイクロコピー, バッジラベルなど一部はより細字が必要。
     styles/tailwind.css の --text-xxs / --text-2xs と同期を保つ。 */
  textSize: {
    /** 10px — 極細（フッター注記, 括弧内補足）。 */
    xxs: '0.625rem',
    /** 11px — 細字（連絡先カード本文, ロール要約インライン）。 */
    twoXs: '0.6875rem',
  },

  /* ── シェイプ ───────────────────────────────────────────────────────── */
  radius: {
    /** カード, 入力, ボタンの既定角丸（AntD 準拠）。 */
    ant: 6,
  },

  /* ── エレベーション階層 — 3段階 ────────────────────────────────────
     styles/tailwind.css の同名 CSS 変数と同期を保つ。
       card        既定サーフェスのエレベーション（BaseCard, パネル, リスト行）。
       cardHover   インタラクティブなカードの hover 状態。
       overlay     フローティング UI — AntD の boxShadowSecondary に接続し、
                   Modal / Drawer / Popover / Dropdown / Tooltip が
                   ConfigProvider 経由で自動的に拾う。 */
  shadow: {
    card:
      '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    cardHover:
      '0 1px 2px -2px rgba(0, 0, 0, 0.05), 0 3px 6px 0 rgba(0, 0, 0, 0.04), 0 5px 12px 4px rgba(0, 0, 0, 0.03)',
    overlay:
      '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
} as const;
