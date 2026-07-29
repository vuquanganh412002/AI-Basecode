// 全銀フォーマット（種別コード91・預金口座振替）固定長レコード生成ユーティリティ。
// 仕様: 1レコード=120バイト固定長 / Shift_JIS / 数値(N)=右詰め前ゼロ埋め、
// 文字(C)=左詰め後半角スペース埋め / 使用文字は半角カナ・英大文字・数字。
// docs/demo/全銀フォーマット_91_口座振替データについて.xlsx「レコード定義」準拠。
import * as iconv from 'iconv-lite';

/** 全銀フォーマットの1レコード長（Shift_JIS バイト・固定長）。 */
export const ZENGIN_RECORD_BYTES = 120;

/** 文字列の Shift_JIS バイト長（半角=1, 全角=2）。桁詰めはこの長さで行う。 */
export function sjisBytes(s: string): number {
  return iconv.encode(s, 'Shift_JIS').length;
}

// 全角カタカナ → 半角カタカナ（濁点/半濁点は2文字に分解）。全銀は半角カナのみ。
const KANA_MAP: Record<string, string> = {};
{
  const full =
    'ァアィイゥウェエォオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴー・「」、。゛゜';
  const half =
    'ｧｱｨｲｩｳｪｴｫｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｳﾞｰ･｢｣､｡ﾞﾟ';
  for (let i = 0; i < full.length; i++) KANA_MAP[full[i]] = half[i];
  // 濁音（カ゛→ｶﾞ 等）。
  const dakuHalf = 'ｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾊﾋﾌﾍﾎ';
  const daku = 'ガギグゲゴザジズゼゾダヂヅデドバビブベボ';
  for (let i = 0; i < daku.length; i++) KANA_MAP[daku[i]] = dakuHalf[i] + 'ﾞ';
  const handaku = 'パピプペポ';
  const handakuBase = 'ﾊﾋﾌﾍﾎ';
  for (let i = 0; i < handaku.length; i++) KANA_MAP[handaku[i]] = handakuBase[i] + 'ﾟ';
  // 小書きカナ・その他（半角に1対1対応）。
  Object.assign(KANA_MAP, {
    ャ: 'ｬ',
    ュ: 'ｭ',
    ョ: 'ｮ',
    ッ: 'ｯ',
    ヮ: 'ﾜ',
    ヴ: 'ｳﾞ',
    ヵ: 'ｶ',
    ヶ: 'ｹ',
    ヰ: 'ｲ',
    ヱ: 'ｴ',
  });
}

/**
 * 半角化。全角カタカナ→半角カナ、全角英数記号→半角、全角スペース→半角スペース。
 * 英字は大文字化する（全銀は英大文字中心）。変換できない文字はそのまま残す。
 */
export function toHankaku(input: string | null | undefined): string {
  const s = String(input ?? '');
  let out = '';
  for (const ch of s) {
    if (KANA_MAP[ch]) {
      out += KANA_MAP[ch];
      continue;
    }
    const code = ch.codePointAt(0) as number;
    // 全角英数記号 ！(FF01)〜～(FF5E) → 半角 !(21)〜~(7E)
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCodePoint(code - 0xfee0);
      continue;
    }
    if (code === 0x3000) {
      out += ' '; // 全角スペース
      continue;
    }
    out += ch;
  }
  return out.toUpperCase();
}

/** 数値項目(N): 数字のみ抽出→下位 len 桁→右詰め・前ゼロ埋め。 */
export function padNumZero(value: string | number | null | undefined, len: number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.slice(-len).padStart(len, '0');
}

/** 顧客番号など「右詰め・スペース埋め」の数値枠。 */
export function padNumSpaceRight(value: string | number | null | undefined, len: number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.slice(-len).padStart(len, ' ');
}

/**
 * 文字項目(C): 半角化→左詰め・後半角スペース埋め。桁は **Shift_JIS バイト長**で
 * 合わせる（半角カナ=1バイト）。超過分はバイト単位で安全に切り詰める。
 */
export function padCharSpace(value: string | null | undefined, byteLen: number): string {
  let s = toHankaku(value);
  while (sjisBytes(s) > byteLen) s = Array.from(s).slice(0, -1).join('');
  const pad = byteLen - sjisBytes(s);
  return pad > 0 ? s + ' '.repeat(pad) : s;
}

/** 固定長スペース（ダミー枠）。 */
export function spaces(len: number): string {
  return ' '.repeat(len);
}

/**
 * 各フィールドを連結して1レコード(=ZENGIN_RECORD_BYTES バイト)を生成する。
 * 長さが違う場合は実装バグとして即座に throw する（全銀の受入条件#8）。
 */
export function buildRecord(fields: string[], label: string): string {
  const rec = fields.join('');
  const bytes = sjisBytes(rec);
  if (bytes !== ZENGIN_RECORD_BYTES) {
    throw new Error(
      `[zengin] ${label} レコード長が ${bytes} バイト（期待値${ZENGIN_RECORD_BYTES}）。フィールド桁数の実装ミス。`,
    );
  }
  return rec;
}
