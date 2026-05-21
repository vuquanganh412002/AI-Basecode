// Screen: ACSMS-SCR-018 — 販売店明細検索画面
//
// Fixture builder for the Hanbaiten entity. Values mirror m_hanbaiten schema
// (docs/database/database-design.md §m_hanbaiten v1.2 — todofuken_code added,
// haitatsuryo_shiharai_cycle / tesuryo_kubun labels updated).
//
// Used in: hanbaiten.service.spec, hanbaiten.controller.spec,
//          hanbaiten.integration.spec.

// The Hanbaiten entity ships from /gen-code-backend; this spec is RED phase
// so the import target may not exist yet — keep the type as `any` until the
// entity lands.
type Hanbaiten = any;

export function buildHanbaiten(overrides: Partial<Hanbaiten> = {}): Hanbaiten {
  const now = new Date();
  return {
    hanbaitenId: 1,
    jaId: 1,
    hanbaitenCode: 'H001',
    hanbaitenName: '山田新聞販売店',
    hanbaitenNameKana: 'ﾔﾏﾀﾞｼﾝﾌﾞﾝﾊﾝﾊﾞｲﾃﾝ',
    torihikisakiNo: '',
    todofukenCode: '13',
    yubinNo: '1000001',
    address: '東京都千代田区千代田1-1',
    tel: '0312345678',
    fax: '0312345679',
    shochoName: '山田太郎',
    itakuKubun: 1,
    haitatsuryoTankaId: null,
    haitatsuryoShiharaiCycle: 1,
    tesuryoKubun: 1,
    tesuryoAmount: 500,
    bankCode: '0001',
    bankName: 'みずほ銀行',
    bankBranchCode: '001',
    bankBranchName: '東京支店',
    yokinShubetsu: 1,
    kozaNo: '1234567',
    kozaMeigi: 'ﾔﾏﾀﾞ ﾀﾛｳ',
    haitenFlg: false,
    biko: '',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as Hanbaiten;
}

export function buildHanbaitenListResponse(
  rows: Hanbaiten[],
  page = 1,
  per_page = 20,
  total?: number,
) {
  const t = total ?? rows.length;
  return {
    data: rows.map((r) => ({
      hanbaiten_id: r.hanbaitenId,
      ja_id: r.jaId,
      hanbaiten_code: r.hanbaitenCode,
      hanbaiten_name: r.hanbaitenName,
      todofuken_code: r.todofukenCode,
      todofuken_name: r.todofukenCode === '13' ? '東京都' : '神奈川県',
      yubin_no: r.yubinNo,
      address: r.address,
      tel: r.tel,
      fax: r.fax,
      shocho_name: r.shochoName,
      itaku_kubun: r.itakuKubun,
      haitatsuryo_shiharai_cycle: r.haitatsuryoShiharaiCycle,
      tesuryo_kubun: r.tesuryoKubun,
      tesuryo_amount: r.tesuryoAmount,
      haiten_flg: r.haitenFlg,
      created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updated_at:
        r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    })),
    meta: {
      total: t,
      page,
      per_page,
      total_pages: Math.ceil(t / per_page),
    },
  };
}
