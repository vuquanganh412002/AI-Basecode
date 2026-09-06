import {
  DokusyaShubetsu,
  TetsuzukiShurui,
  ShiharaiHoho,
  DenshiShoninStatus,
} from '@/common/enums';
import {
  mapUserToDokusyaFields,
  mapTetsuzuki,
  normalizePaymentYm,
  paymentEndYmToChushiDate,
  type DenshiUserRow,
  type DenshiFkResolution,
} from './dokusya-sync.mapper';

const FK: DenshiFkResolution = { jaId: 10, kanriShitenId: 20, hanbaitenId: null };

/** 電子版 users 行のベース（電子版・有料・承認済・新規の代表値）。 */
function buildUser(overrides: Partial<DenshiUserRow> = {}): DenshiUserRow {
  return {
    id: 1001,
    first_name: '農業',
    last_name: '太郎',
    first_kana: 'のうぎょう',
    last_kana: 'たろう',
    zip1: '100',
    zip2: '0001',
    pref_id: 13,
    addr: '千代田区',
    city: '1-1-1',
    building: 'マンション101',
    tel1: '0312345678',
    tel2: '09011112222',
    email: 'taro@example.com',
    melmaga: 1,
    birthyear: 1980,
    sex: 1, // 男性
    status: 0, // 新規
    approval: 1, // 承認済
    member_type: 2, // 有料
    subscribe_flg: 1, // 本紙購読あり
    payment_id: null,
    payment_cycle: 12,
    payment_start_ym: '202604',
    profession: '0',
    products: '0,1',
    activated_at: '2026-04-01 00:00:00',
    deleted_at: null,
    paper_permission_dt: null, // 併読でない → 電子版
    ShopCd: null,
    JACd: '1301002001',
    Campagna_flg: '0',
    remarks1: 'メモ1',
    remarks2: '',
    remarks3: 'メモ3',
    ...overrides,
  };
}

describe('dokusya-sync.mapper — mapUserToDokusyaFields', () => {
  it('maps identity / FK / fixed defaults for a 電子版 subscriber', () => {
    const v = mapUserToDokusyaFields(buildUser(), FK);
    expect(v.jaId).toBe(10);
    expect(v.kanriShitenId).toBe(20);
    expect(v.shitenId).toBeNull();
    expect(v.kumiaiinCode).toBe('');
    expect(v.dokusyaBusu).toBe(1); // 電子版は 1 契約=1 部固定
    expect(v.yubinKubun).toBe('0');
    expect(v.tankaId).toBeNull();
    // denshi_kaiin_id は履歴に無いため DokusyaFields には含めない。
    expect('denshiKaiinId' in v).toBe(false);
  });

  it('resolves 電子版(2) when paper_permission_dt is empty, 併読(3) when set', () => {
    expect(mapUserToDokusyaFields(buildUser(), FK).dokusyaShubetsu).toBe(
      DokusyaShubetsu.DIGITAL,
    );
    const heidoku = mapUserToDokusyaFields(
      buildUser({ paper_permission_dt: '2026-04-01 00:00:00' }),
      FK,
    );
    expect(heidoku.dokusyaShubetsu).toBe(DokusyaShubetsu.BOTH);
  });

  // paper_permission_dt は char(8) で、実データは区切り無しの 'YYYYMMDD'
  // （例 '20230220'）。区切りありしか受けない実装だと、日付が入っているのに
  // 電子版(2) として取り込まれ、併読が永久に発生しなくなる。
  it.each([
    ['20230220', DokusyaShubetsu.BOTH],       // 実データのフォーマット
    ['2026-04-01', DokusyaShubetsu.BOTH],
    ['2026/04/01', DokusyaShubetsu.BOTH],
    ['', DokusyaShubetsu.DIGITAL],
    [null, DokusyaShubetsu.DIGITAL],
    ['00000000', DokusyaShubetsu.DIGITAL],    // 桁は合うが実在しない日付
    ['20230230', DokusyaShubetsu.DIGITAL],    // 2月30日
    ['2023022', DokusyaShubetsu.DIGITAL],     // 7桁
  ])('paper_permission_dt=%p → dokusya_shubetsu=%s', (ppd, expected) => {
    const v = mapUserToDokusyaFields(
      buildUser({ paper_permission_dt: ppd }),
      FK,
    );
    expect(v.dokusyaShubetsu).toBe(expected);
  });

  it('sets haitatsu_same_flg TRUE for 電子版 and copies subscriber address', () => {
    const v = mapUserToDokusyaFields(buildUser(), FK);
    expect(v.haitatsuSameFlg).toBe(true);
    expect(v.haitatsuShikuchoson).toBe('千代田区');
  });

  it('uses paper_* address for 併読 (haitatsu_same_flg FALSE)', () => {
    const v = mapUserToDokusyaFields(
      buildUser({
        paper_permission_dt: '2026-04-01',
        paper_zip: '5400001',
        paper_pref_id: 27,
        paper_addr: '大阪市中央区',
        paper_city: '2-2-2',
        paper_building: 'ビル',
      }),
      FK,
    );
    expect(v.haitatsuSameFlg).toBe(false);
    expect(v.haitatsuYubinNo).toBe('5400001');
    expect(v.haitatsuTodofukenCode).toBe('27');
    expect(v.haitatsuShikuchoson).toBe('大阪市中央区');
  });

  it('joins zip1+zip2 without hyphen and pads pref_id to 2 digits', () => {
    const v = mapUserToDokusyaFields(buildUser({ zip1: '100', zip2: '0001', pref_id: 3 }), FK);
    expect(v.yubinNo).toBe('1000001');
    expect(v.todofukenCode).toBe('03');
  });

  it('maps names / kana / contacts / email straight through', () => {
    const v = mapUserToDokusyaFields(buildUser(), FK);
    expect(v.shimeiSei).toBe('農業');
    expect(v.shimeiMei).toBe('太郎');
    expect(v.shimeiKanaSei).toBe('のうぎょう');
    expect(v.shimeiKanaMei).toBe('たろう');
    expect(v.renrakusaki1).toBe('0312345678');
    expect(v.renrakusaki2).toBe('09011112222');
    expect(v.email).toBe('taro@example.com');
  });

  it('maps sex → gender (0→2, 1→1, 未入力→9)', () => {
    expect(mapUserToDokusyaFields(buildUser({ sex: 1 }), FK).gender).toBe(1);
    expect(mapUserToDokusyaFields(buildUser({ sex: 0 }), FK).gender).toBe(2);
    expect(mapUserToDokusyaFields(buildUser({ sex: null }), FK).gender).toBe(9);
  });

  it('maps status → tetsuzuki (9→解約, 0/1/3→新規)', () => {
    expect(mapTetsuzuki(9)).toBe(TetsuzukiShurui.KAIYAKU);
    expect(mapTetsuzuki(0)).toBe(TetsuzukiShurui.SHINKI);
    expect(mapTetsuzuki(1)).toBe(TetsuzukiShurui.SHINKI);
    expect(mapTetsuzuki(3)).toBe(TetsuzukiShurui.SHINKI);
  });

  it('maps approval → denshi_shonin_status (9対象外→NULL)', () => {
    expect(mapUserToDokusyaFields(buildUser({ approval: 0 }), FK).denshiShoninStatus).toBe(
      DenshiShoninStatus.PENDING,
    );
    expect(mapUserToDokusyaFields(buildUser({ approval: 1 }), FK).denshiShoninStatus).toBe(
      DenshiShoninStatus.APPROVED,
    );
    expect(mapUserToDokusyaFields(buildUser({ approval: 2 }), FK).denshiShoninStatus).toBe(
      DenshiShoninStatus.REJECTED,
    );
    expect(mapUserToDokusyaFields(buildUser({ approval: 9 }), FK).denshiShoninStatus).toBeNull();
  });

  describe('denshi_shonin_status — 承認ワークフロー対象外カテゴリは approval を無視して常に NULL（不具合修正2026-08）', () => {
    it('電子版(2) + クレジットカード(payment_id=6) は approval が承認済(1)でも NULL', () => {
      const result = mapUserToDokusyaFields(
        buildUser({ payment_id: 6, approval: 1, member_type: 2, paper_permission_dt: null }),
        FK,
      );
      expect(result.dokusyaShubetsu).toBe(DokusyaShubetsu.DIGITAL);
      expect(result.shiharaiHoho).toBe(ShiharaiHoho.CREDIT_CARD);
      expect(result.denshiShoninStatus).toBeNull();
    });

    it('併読(paper_permission_dt あり) は approval が承認済(1)でも NULL', () => {
      const result = mapUserToDokusyaFields(
        buildUser({ paper_permission_dt: '20260401', approval: 1, payment_id: 6 }),
        FK,
      );
      expect(result.dokusyaShubetsu).toBe(DokusyaShubetsu.BOTH);
      expect(result.denshiShoninStatus).toBeNull();
    });

    it('電子版(2) + 無料会員(member_type=1) は approval が承認済(1)でも NULL', () => {
      const result = mapUserToDokusyaFields(
        buildUser({
          member_type: 1,
          payment_id: 9,
          approval: 1,
          paper_permission_dt: null,
        }),
        FK,
      );
      expect(result.dokusyaShubetsu).toBe(DokusyaShubetsu.DIGITAL);
      expect(result.denshiDokusyaShubetsu).toBe(0);
      expect(result.denshiShoninStatus).toBeNull();
    });

    it('電子版(2) + 有料(member_type=2) + クレカ以外の支払方法 は従来どおり approval をマップする', () => {
      const result = mapUserToDokusyaFields(
        buildUser({
          member_type: 2,
          payment_id: 1, // 口座引落
          approval: 0,
          paper_permission_dt: null,
        }),
        FK,
      );
      expect(result.denshiShoninStatus).toBe(DenshiShoninStatus.PENDING);
    });
  });

  it('maps member_type → denshi_dokusya_shubetsu (1無料→0, 2有料→1)', () => {
    expect(mapUserToDokusyaFields(buildUser({ member_type: 1 }), FK).denshiDokusyaShubetsu).toBe(0);
    expect(mapUserToDokusyaFields(buildUser({ member_type: 2 }), FK).denshiDokusyaShubetsu).toBe(1);
  });

  it('maps subscribe_flg → honshi_kodoku_flg (1→true, 0→false)', () => {
    expect(mapUserToDokusyaFields(buildUser({ subscribe_flg: 1 }), FK).honshiKodokuFlg).toBe(true);
    expect(mapUserToDokusyaFields(buildUser({ subscribe_flg: 0 }), FK).honshiKodokuFlg).toBe(false);
  });

  it('maps payment_id 1:1 with shiharai_hoho（6→クレカ, 1→口座引落, 未設定/不明→その他）', () => {
    expect(mapUserToDokusyaFields(buildUser({ payment_id: 6 }), FK).shiharaiHoho).toBe(
      ShiharaiHoho.CREDIT_CARD,
    );
    expect(mapUserToDokusyaFields(buildUser({ payment_id: 1 }), FK).shiharaiHoho).toBe(
      ShiharaiHoho.KOZA_HIKIOTOSHI,
    );
    // 未設定
    expect(mapUserToDokusyaFields(buildUser({ payment_id: null }), FK).shiharaiHoho).toBe(
      ShiharaiHoho.SONOTA,
    );
    // 不明コード
    expect(mapUserToDokusyaFields(buildUser({ payment_id: 999 }), FK).shiharaiHoho).toBe(
      ShiharaiHoho.SONOTA,
    );
  });

  it('maps dates: activated_at → kaishi/shoki, payment_start_ym → seikyu', () => {
    const v = mapUserToDokusyaFields(
      buildUser({ activated_at: '2026-04-01 09:00:00', deleted_at: null, payment_start_ym: '202604' }),
      FK,
    );
    expect(v.dokusyaKaishiDate).toBe('2026-04-01');
    expect(v.shokiDokusyaKaishiDate).toBe('2026-04-01');
    expect(v.seikyuKaishiMonth).toBe('202604');
  });

  // #57986: dokusyaChushiDate はもう mapUserToDokusyaFields では設定しない（service の
  // 解約分岐が payment_end_ym から算出して直接書く）。deleted_at の値に関わらず、
  // このキー自体が values に含まれないことを保証する回帰テスト——含まれてしまうと
  // 通常の UPDATE 行が中止日を意図せず carry-forward せず null 上書きしてしまう
  // （2026-08 実データで発覚した不具合の再発防止）。
  it('#57986: should NOT set dokusyaChushiDate at all (regardless of deleted_at) — computed by the service cancel branch instead', () => {
    const withDeletedAt = mapUserToDokusyaFields(
      buildUser({ deleted_at: '2026-09-30 00:00:00' }),
      FK,
    );
    expect('dokusyaChushiDate' in withDeletedAt).toBe(false);

    const withoutDeletedAt = mapUserToDokusyaFields(buildUser({ deleted_at: null }), FK);
    expect('dokusyaChushiDate' in withoutDeletedAt).toBe(false);
  });

  it('does NOT map remarks1..5 into biko (cloud 専有列・顧客要件2026-08-26)', () => {
    const v = mapUserToDokusyaFields(buildUser({ remarks1: 'A', remarks2: '', remarks3: 'C' }), FK);
    // DokusyaFields に biko キー自体を含めない → CREATE 時は列既定値、UPDATE 時は
    // 前回値から carry-forward される（shokiDokusyaKaishiDate 等と同じ規約）。
    expect('biko' in v).toBe(false);
  });

  it('maps profession/products CSV via conversion table', () => {
    const v = mapUserToDokusyaFields(buildUser({ profession: '0', products: '0,1' }), FK);
    expect(v.dokusyasoBunrui).toBe('0');
    expect(v.nogyosyaBunrui).toBe('0,1');
  });

  /**
   * 顧客DB設計 2026-08 の従属 4 項目。push 側 denshiban-push.mapper の逆変換。
   * 実データ（cmsDB_real.users 153,929 行）では 1桁フラグは char(1) の '0'/'1'、
   * 自由記述は NULL または 255 文字以内で入っている。
   */
  describe('従属 4 項目', () => {
    const map = (o: Partial<DenshiUserRow>) =>
      mapUserToDokusyaFields(buildUser(o), FK);

    it("maps profession_and_ja '1'/'0' to jaYakushokuinFlg true/false", () => {
      expect(
        map({ profession: '0', profession_and_ja: '1' }).jaYakushokuinFlg,
      ).toBe(true);
      expect(
        map({ profession: '0', profession_and_ja: '0' }).jaYakushokuinFlg,
      ).toBe(false);
    });

    it("maps profession_and_agri '1'/'0' to nogyoKankeiFlg true/false", () => {
      expect(
        map({ profession: '2', profession_and_agri: '1' }).nogyoKankeiFlg,
      ).toBe(true);
      expect(
        map({ profession: '2', profession_and_agri: '0' }).nogyoKankeiFlg,
      ).toBe(false);
    });

    it('maps others_profession to dokusyasoBunruiSonota', () => {
      expect(
        map({ profession: '999', others_profession: '地方公務員' })
          .dokusyasoBunruiSonota,
      ).toBe('地方公務員');
    });

    it('maps others_products to nogyosyaBunruiSonota', () => {
      expect(
        map({
          profession: '0',
          products: '999',
          others_products: '麦、大豆、麦後作そば',
        }).nogyosyaBunruiSonota,
      ).toBe('麦、大豆、麦後作そば');
    });

    it('treats NULL / missing as false / empty (列は NOT NULL)', () => {
      const v = map({
        profession: '0',
        profession_and_ja: null,
        profession_and_agri: null,
        others_profession: null,
        products: null,
        others_products: null,
      });
      expect(v.jaYakushokuinFlg).toBe(false);
      expect(v.nogyoKankeiFlg).toBe(false);
      expect(v.dokusyasoBunruiSonota).toBe('');
      expect(v.nogyosyaBunruiSonota).toBe('');
    });

    /**
     * 電子版も同じ条件を自分の API で強制している（条件付き項目 V26〜V30）ので、
     * 実データ 153,929 行では 1 件も該当しない。効くのはバリデータを経由して
     * いない行だけで、そのまま取り込むと今度は push で弾かれる。
     */
    it('drops values whose parent 分類 does not allow them', () => {
      const v = map({
        profession: '3', // 学生 — どの従属項目も持てない
        profession_and_ja: '1',
        profession_and_agri: '1',
        others_profession: '自営業',
        products: '999',
        others_products: 'きのこ',
      });
      expect(v.jaYakushokuinFlg).toBe(false);
      expect(v.nogyoKankeiFlg).toBe(false);
      expect(v.dokusyasoBunruiSonota).toBe('');
      // 主な生産物その他のゲートは「取り込んだ nogyosyaBunrui が 999 を含むか」。
      // pull は products を読者属性と無関係に取り込む既存仕様なので、ここでは
      // 999 が残り自由記述も残る — 保存された分類と内容の対応は保たれている。
      // （実データ 153,929 行では profession<>0 で products を持つ行は 0 件。）
      expect(v.nogyosyaBunrui).toBe('999');
      expect(v.nogyosyaBunruiSonota).toBe('きのこ');
    });

    it('clamps 自由記述 to the column width (VARCHAR(255))', () => {
      const v = map({
        profession: '999',
        others_profession: 'あ'.repeat(300),
      });
      expect(v.dokusyasoBunruiSonota).toHaveLength(255);
    });
  });
});

// #57986 — 解約分岐の中止日算出（payment_end_ym ベース）で使う純関数。
describe('normalizePaymentYm', () => {
  it('returns the 6-digit string unchanged when valid', () => {
    expect(normalizePaymentYm('202609')).toBe('202609');
  });

  it('returns null for non-6-digit / non-numeric input', () => {
    expect(normalizePaymentYm('2026-09')).toBeNull();
    expect(normalizePaymentYm('20269')).toBeNull();
    expect(normalizePaymentYm('2026099')).toBeNull();
    expect(normalizePaymentYm('abcdef')).toBeNull();
  });

  it('returns null for a month outside 01-12', () => {
    expect(normalizePaymentYm('202600')).toBeNull();
    expect(normalizePaymentYm('202613')).toBeNull();
  });

  it('returns null / handles missing input', () => {
    expect(normalizePaymentYm(null)).toBeNull();
    expect(normalizePaymentYm(undefined)).toBeNull();
    expect(normalizePaymentYm('')).toBeNull();
  });
});

describe('paymentEndYmToChushiDate', () => {
  it('returns the LAST day of the payment_end_ym month (30-day month)', () => {
    expect(paymentEndYmToChushiDate('202609')).toBe('2026-09-30');
  });

  it('returns the last day of a 31-day month', () => {
    expect(paymentEndYmToChushiDate('202610')).toBe('2026-10-31');
  });

  it('handles December (last day of the SAME year, no rollover)', () => {
    expect(paymentEndYmToChushiDate('202612')).toBe('2026-12-31');
  });

  it('handles a leap-year February', () => {
    expect(paymentEndYmToChushiDate('202802')).toBe('2028-02-29');
  });

  it('handles a non-leap-year February', () => {
    expect(paymentEndYmToChushiDate('202602')).toBe('2026-02-28');
  });

  it('returns null for invalid input (delegates to normalizePaymentYm)', () => {
    expect(paymentEndYmToChushiDate('bad')).toBeNull();
    expect(paymentEndYmToChushiDate(null)).toBeNull();
  });
});
