/**
 * 診断用スクリプト（一時）— 電子版 push 用 create payload を
 * 「Excel取込 (SCR-016)」と「画面登録 (SCR-011)」の2経路で組み立てて突き合わせる。
 *
 * 実行: docker exec agrinews-backend-1 \
 *   npx ts-node -r tsconfig-paths/register scripts/denshiban-payload-diff.ts
 *
 * 入力: scripts/.excel-row.json（テンプレートの2行目を物理カラム名へ写したもの）
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DokusyaShubetsu, TetsuzukiShurui } from '@/common/enums';
import { DenshiShoninStatus } from '@/common/enums/denshi-shonin-status.enum';
import type { Dokusya } from '@/database/entities/dokusya.entity';
import { buildBunruiPayload, buildHaitatsuPayload } from '@/modules/dokusya/dokusya.mapper';
import { toCreatePayload } from '@/modules/denshiban/denshiban-push.mapper';

const row: Record<string, unknown> = JSON.parse(
  readFileSync(join(__dirname, '.excel-row.json'), 'utf8'),
);

const HANBAITEN_DUMMY_CODE = '9999999999';
const JACD = '1165741000'; // 管理支店 116-5741-000 → 数字のみ10桁

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
const intOrNull = (v: unknown): number | null =>
  v === undefined || v === null || v === '' ? null : Number(v);

// ── 取込 (SCR-016) ────────────────────────────────────────────────────────
// importExcel の前処理: 電子版は部数=1 / 販売店=ダミー を全行へ強制。
const imp: Record<string, unknown> = { ...row };
imp.dokusya_shubetsu = DokusyaShubetsu.DIGITAL;
imp.dokusya_busu = 1;
imp.hanbaiten_code = HANBAITEN_DUMMY_CODE;

const importEntity = {
  jaId: 1,
  kanriShitenId: 1,
  shitenId: null,
  kumiaiinCode: str(imp.kumiaiin_code),
  dokusyaShubetsu: intOrNull(imp.dokusya_shubetsu),
  tetsuzukiShurui: TetsuzukiShurui.SHINKI,
  shimeiSei: str(imp.shimei_sei),
  shimeiMei: str(imp.shimei_mei),
  shimeiKanaSei: str(imp.shimei_kana_sei),
  shimeiKanaMei: str(imp.shimei_kana_mei),
  dokusyaBusu: Number(imp.dokusya_busu ?? 0),
  yubinNo: str(imp.yubin_no),
  todofukenCode: str(imp.todofuken_code),
  shikuchoson: str(imp.shikuchoson),
  chomeBanchi: str(imp.chome_banchi),
  tatemonoMei: str(imp.tatemono_mei),
  renrakusaki1: str(imp.renrakusaki_1),
  renrakusaki2: str(imp.renrakusaki_2),
  email: str(imp.email),
  mailMagazineFlg: Number(imp.mail_magazine_flg ?? 0),
  birthYear: intOrNull(imp.birth_year),
  gender: intOrNull(imp.gender),
  ...buildHaitatsuPayload({
    dokusya_shubetsu: imp.dokusya_shubetsu as number,
    haitatsu_same_flg: false,
    haitatsu_yubin_no: str(imp.haitatsu_yubin_no),
    haitatsu_todofuken_code: str(imp.haitatsu_todofuken_code),
    haitatsu_shikuchoson: str(imp.haitatsu_shikuchoson),
    haitatsu_chome_banchi: str(imp.haitatsu_chome_banchi),
    haitatsu_tatemono_mei: str(imp.haitatsu_tatemono_mei),
    haitatsu_renrakusaki_1: str(imp.haitatsu_renrakusaki_1),
    haitatsu_renrakusaki_2: str(imp.haitatsu_renrakusaki_2),
    haitatsu_shimei_sei: str(imp.haitatsu_shimei_sei),
    haitatsu_shimei_mei: str(imp.haitatsu_shimei_mei),
    haitatsu_shimei_kana_sei: str(imp.haitatsu_shimei_kana_sei),
    haitatsu_shimei_kana_mei: str(imp.haitatsu_shimei_kana_mei),
  } as never),
  hanbaitenId: 1,
  tankaId: null, // ← 単価コード '001' が m_tanka(ja_id=1) に無いため解決できない
  yubinKubun: imp.yubin_kubun ?? 0,
  shiharaiHoho: intOrNull(imp.shiharai_hoho),
  dokusyaryoShiharaiCycle: intOrNull(imp.dokusyaryo_shiharai_cycle),
  bankBranchCode: str(imp.bank_branch_code),
  bankBranchName: str(imp.bank_branch_name),
  hikiotoshiYokinShubetsu: intOrNull(imp.hikiotoshi_yokin_shubetsu),
  hikiotoshiKozaNo: str(imp.hikiotoshi_koza_no),
  hikiotoshiKozaMeigi: str(imp.hikiotoshi_koza_meigi),
  ...buildBunruiPayload({
    dokusyaso_bunrui: str(imp.dokusyaso_bunrui),
    ja_yakushokuin_flg: imp.ja_yakushokuin_flg,
    nogyo_kankei_flg: imp.nogyo_kankei_flg,
    dokusyaso_bunrui_sonota: str(imp.dokusyaso_bunrui_sonota),
    nogyosya_bunrui: str(imp.nogyosya_bunrui),
    nogyosya_bunrui_sonota: str(imp.nogyosya_bunrui_sonota),
  } as never),
  biko: str(imp.biko),
  denshiShoninStatus: DenshiShoninStatus.APPROVED, // 取込は承認済で登録
  honshiKodokuFlg: false, // DB default（どちらの経路も書かない）
} as unknown as Dokusya;

// ── 画面登録 (SCR-011) ────────────────────────────────────────────────────
// 同じ人物を画面から電子版で新規登録したときの DTO 相当。
const scr011Dto = {
  dokusya_shubetsu: DokusyaShubetsu.DIGITAL,
  tetsuzuki_shurui: TetsuzukiShurui.SHINKI,
  kanri_shiten_id: 1,
  shiten_id: null,
  kumiaiin_code: str(row.kumiaiin_code),
  shimei_sei: str(row.shimei_sei),
  shimei_mei: str(row.shimei_mei),
  shimei_kana_sei: str(row.shimei_kana_sei),
  shimei_kana_mei: str(row.shimei_kana_mei),
  dokusya_busu: 1,
  yubin_no: str(row.yubin_no),
  todofuken_code: str(row.todofuken_code),
  shikuchoson: str(row.shikuchoson),
  chome_banchi: str(row.chome_banchi),
  tatemono_mei: str(row.tatemono_mei),
  renrakusaki_1: str(row.renrakusaki_1),
  renrakusaki_2: str(row.renrakusaki_2),
  email: str(row.email),
  // 画面は未選択を null で送る（取込は 0 に丸める）— ここが差になるか要確認
  mail_magazine_flg: row.mail_magazine_flg === '' ? null : Number(row.mail_magazine_flg),
  birth_year: intOrNull(row.birth_year),
  gender: intOrNull(row.gender),
  yubin_kubun: row.yubin_kubun ?? 0,
  shiharai_hoho: intOrNull(row.shiharai_hoho),
  dokusyaryo_shiharai_cycle: intOrNull(row.dokusyaryo_shiharai_cycle),
  dokusyaso_bunrui: str(row.dokusyaso_bunrui),
  ja_yakushokuin_flg: row.ja_yakushokuin_flg,
  nogyo_kankei_flg: row.nogyo_kankei_flg,
  dokusyaso_bunrui_sonota: str(row.dokusyaso_bunrui_sonota),
  nogyosya_bunrui: str(row.nogyosya_bunrui),
  nogyosya_bunrui_sonota: str(row.nogyosya_bunrui_sonota),
  biko: str(row.biko),
};

const scr011Entity = {
  jaId: 1,
  kanriShitenId: 1,
  shitenId: null,
  kumiaiinCode: scr011Dto.kumiaiin_code,
  dokusyaShubetsu: Number(scr011Dto.dokusya_shubetsu),
  tetsuzukiShurui: Number(scr011Dto.tetsuzuki_shurui),
  denshiDokusyaShubetsu: null,
  shimeiSei: scr011Dto.shimei_sei,
  shimeiMei: scr011Dto.shimei_mei,
  shimeiKanaSei: scr011Dto.shimei_kana_sei,
  shimeiKanaMei: scr011Dto.shimei_kana_mei,
  dokusyaBusu: Number(scr011Dto.dokusya_busu),
  yubinNo: scr011Dto.yubin_no,
  todofukenCode: scr011Dto.todofuken_code,
  shikuchoson: scr011Dto.shikuchoson,
  chomeBanchi: scr011Dto.chome_banchi,
  tatemonoMei: scr011Dto.tatemono_mei ?? '',
  renrakusaki1: scr011Dto.renrakusaki_1,
  renrakusaki2: scr011Dto.renrakusaki_2 ?? '',
  email: scr011Dto.email ?? '',
  mailMagazineFlg:
    scr011Dto.mail_magazine_flg != null ? Number(scr011Dto.mail_magazine_flg) : null,
  birthYear: scr011Dto.birth_year ?? null,
  gender: scr011Dto.gender ?? null,
  ...buildHaitatsuPayload(scr011Dto as never),
  hanbaitenId: 1,
  tankaId: 1,
  yubinKubun: scr011Dto.yubin_kubun ?? 0,
  shiharaiHoho: Number(scr011Dto.shiharai_hoho),
  dokusyaryoShiharaiCycle: scr011Dto.dokusyaryo_shiharai_cycle ?? null,
  bankBranchCode: '',
  bankBranchName: '',
  hikiotoshiYokinShubetsu: null,
  hikiotoshiKozaNo: '',
  hikiotoshiKozaMeigi: '',
  ...buildBunruiPayload(scr011Dto as never),
  biko: scr011Dto.biko ?? '',
  denshiShoninStatus: DenshiShoninStatus.PENDING, // 画面登録は承認待ち
  honshiKodokuFlg: false,
} as unknown as Dokusya;

// ── payload 生成 ──────────────────────────────────────────────────────────
const impPayload = toCreatePayload(importEntity, JACD);
const uiPayload = toCreatePayload(scr011Entity, JACD);

// ── 電子版デモ validators.js の規則（転記）──────────────────────────────
const S = (v: unknown) => String(v ?? '').trim();
const digits = (max: number) => (v: unknown) => new RegExp(`^[0-9]{1,${max}}$`).test(S(v));
const exactDigits = (n: number) => (v: unknown) => new RegExp(`^[0-9]{${n}}$`).test(S(v));
const maxLen = (n: number) => (v: unknown) => S(v).length <= n;
const oneOf = (...a: string[]) => (v: unknown) => a.includes(S(v));
const hiragana = (n: number) => (v: unknown) =>
  S(v).length <= n && /^[ぁ-ゟー　\s]+$/.test(S(v));
const emailRe = (v: unknown) =>
  S(v).length <= 255 && /^[\x21-\x7E]+@[\x21-\x7E]+\.[\x21-\x7E]+$/.test(S(v));
const codeList = (...a: string[]) => (v: unknown) =>
  S(v).split(',').map((p) => p.trim()).every((p) => a.includes(p));
const prefId = (v: unknown) =>
  digits(2)(v) && Number(S(v)) >= 1 && Number(S(v)) <= 47;

const RULES: Record<string, { code: string; check: (v: unknown) => boolean }> = {
  jacd_execute: { code: 'V03', check: exactDigits(10) },
  first_name: { code: 'V05', check: maxLen(255) },
  last_name: { code: 'V06', check: maxLen(255) },
  first_kana: { code: 'V07', check: hiragana(255) },
  last_kana: { code: 'V08', check: hiragana(255) },
  zip: { code: 'V09', check: digits(7) },
  pref_id: { code: 'V10', check: prefId },
  addr: { code: 'V11', check: maxLen(255) },
  city: { code: 'V12', check: maxLen(255) },
  building: { code: 'V13', check: maxLen(255) },
  tel: { code: 'V14', check: digits(13) },
  email: { code: 'V15', check: emailRe },
  subscribe_flg: { code: 'V16', check: oneOf('0', '1') },
  remarks1: { code: 'V19', check: maxLen(255) },
  remarks2: { code: 'V20', check: maxLen(255) },
  remarks3: { code: 'V21', check: maxLen(255) },
  remarks4: { code: 'V22', check: maxLen(255) },
  remarks5: { code: 'V23', check: maxLen(255) },
  melmaga: { code: 'V24', check: oneOf('0', '1') },
  profession: { code: 'V25', check: codeList('0', '1', '2', '3', '999') },
  profession_and_ja: { code: 'V26', check: oneOf('0', '1') },
  profession_and_agri: { code: 'V27', check: oneOf('0', '1') },
  others_profession: { code: 'V28', check: maxLen(255) },
  products: { code: 'V29', check: codeList('0', '1', '2', '3', '4', '5', '999') },
  others_products: { code: 'V30', check: maxLen(255) },
  birthyear: { code: 'V31', check: exactDigits(4) },
  sex: { code: 'V32', check: oneOf('0', '1', '9') },
  payment_start: { code: 'V33', check: oneOf('0', '1') },
};
const CREATE_REQUIRED = [
  'jacd_execute', 'first_name', 'last_name', 'first_kana', 'last_kana',
  'zip', 'pref_id', 'addr', 'city', 'tel', 'email',
  'subscribe_flg', 'melmaga', 'profession', 'payment_start',
];
const listHas = (v: unknown, code: string) =>
  S(v).split(',').map((p) => p.trim()).includes(code);
const CONDITIONAL: Array<{ field: string; when: (d: Record<string, string>) => boolean }> = [
  { field: 'profession_and_ja', when: (d) => listHas(d.profession, '0') },
  { field: 'profession_and_agri', when: (d) => listHas(d.profession, '2') },
  { field: 'others_profession', when: (d) => listHas(d.profession, '999') },
  { field: 'products', when: (d) => listHas(d.profession, '0') },
  { field: 'others_products', when: (d) => S(d.products) !== '' && listHas(d.products, '999') },
];
const present = (d: Record<string, string>, k: string) =>
  d[k] !== undefined && d[k] !== null && S(d[k]) !== '';

function validateCreate(d: Record<string, string>): string {
  for (const f of CREATE_REQUIRED) {
    if (!present(d, f)) return `${RULES[f].code}  ${f} is required`;
  }
  for (const [f, r] of Object.entries(RULES)) {
    if (!present(d, f)) continue;
    if (!r.check(d[f])) return `${r.code}  ${f}=${d[f]}`;
  }
  for (const { field, when } of CONDITIONAL) {
    if (!present(d, field)) continue;
    if (!when(d)) return `${RULES[field].code}  ${field} not allowed with this profession/products`;
  }
  return 'OK (V/E チェックは全通過 — 残るは電子版側の業務ルール P01/P99)';
}

// ── 出力 ──────────────────────────────────────────────────────────────────
const keys = [...new Set([...Object.keys(impPayload), ...Object.keys(uiPayload)])].sort();
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].length));

console.log('\n========== 電子版 push (action_kbn=create) payload 比較 ==========');
console.log('入力: 購読者Excelデータ取込_テンプレート-v3.xlsx 2行目 / 購読種別=電子版(2)\n');
console.log(pad('key', 22) + pad('取込 (SCR-016)', 42) + pad('画面 (SCR-011)', 42) + 'diff');
console.log('-'.repeat(112));
for (const k of keys) {
  const a = impPayload[k] === undefined ? '(キー無し)' : JSON.stringify(impPayload[k]);
  const b = uiPayload[k] === undefined ? '(キー無し)' : JSON.stringify(uiPayload[k]);
  console.log(pad(k, 22) + pad(a, 42) + pad(b, 42) + (a === b ? '' : '  ★差分'));
}

console.log('\n---------- 電子版 validators.js 判定 ----------');
console.log('取込 (SCR-016) :', validateCreate(impPayload));
console.log('画面 (SCR-011) :', validateCreate(uiPayload));

console.log('\n---------- push に到達する前の cloud 側ガード ----------');
console.log('tankaId (取込)  :', (importEntity as { tankaId: number | null }).tankaId,
  "  ← Excel の 新聞単価='001' は m_tanka(ja_id=1) に存在しない");
console.log('denshi_shonin_status: 取込=1(承認済) / 画面=0(承認待ち)  ※payload には出ない');
console.log('resolveJacd     :', JACD, `(${JACD.length}桁)`,
  /^\d{10}$/.test(JACD) ? 'OK' : 'NG — push 不可');
console.log('');
