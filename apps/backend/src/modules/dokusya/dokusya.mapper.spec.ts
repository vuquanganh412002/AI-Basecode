// Screen: ACSMS-SCR-011 / 013 / 014 / 015 — 購読者レスポンスマッパー（純関数）。
//
// 本 spec の主眼は `.claude/rules/nestjs.md` §Nullable field serialization:
// NULL 許容列は NULL のまま直列化し、0 や '' へ丸めない。
// `t_dokusya` / `t_dokusya_rireki` の `hanbaiten_id` / `tanka_id` は
// migration 1783700000000 で NOT NULL を外しているため対象。
//
// 0 へ丸めていた頃の実害:
//   1. FE のセレクトが候補に無い「0」を素の値として描画し、未選択なのに 0 と表示
//   2. FE がその 0 を更新リクエストへ echo → FK ガードが「id=0 が存在しない」で 400
// 同じ理由で kanri_shiten_id / shiten_id は既に nullable 化済み（mapper 内コメント参照）。

import { Dokusya } from '@/database/entities/dokusya.entity';
import {
  buildBunruiPayload,
  toDokusyaResponse,
  toDokusyaListItem,
  toDokusyaRirekiListItem,
  toReplaceSearchItem,
  type DokusyaJoinFields,
} from '@/modules/dokusya/dokusya.mapper';
import { buildDokusya } from '@test/fixtures/dokusya.factory';

const joins: DokusyaJoinFields = {
  hanbaiten_name: '',
  tanka_name: '',
  bank_shiten_id: null,
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
};

describe('dokusya.mapper — NULL 許容列の直列化', () => {
  describe('toDokusyaResponse (詳細)', () => {
    it('should serialize NULL hanbaiten_id / tanka_id as null (not 0)', () => {
      const entity = buildDokusya({
        hanbaitenId: null,
        tankaId: null,
      } as Partial<Dokusya>);

      const res = toDokusyaResponse(entity, joins);

      expect(res.hanbaiten_id).toBeNull();
      expect(res.tanka_id).toBeNull();
    });

    it('should keep real ids untouched', () => {
      const entity = buildDokusya({
        hanbaitenId: 5,
        tankaId: 1,
      } as Partial<Dokusya>);

      const res = toDokusyaResponse(entity, joins);

      expect(res.hanbaiten_id).toBe(5);
      expect(res.tanka_id).toBe(1);
    });

    // 顧客要件 2026-08 — 画面の「紙版購読状況　有り」判定に使うので API に載せる。
    it('should serialize honshi_kodoku_flg', () => {
      expect(
        toDokusyaResponse(
          buildDokusya({ honshiKodokuFlg: true } as Partial<Dokusya>),
          joins,
        ).honshi_kodoku_flg,
      ).toBe(true);
      expect(
        toDokusyaResponse(
          buildDokusya({ honshiKodokuFlg: false } as Partial<Dokusya>),
          joins,
        ).honshi_kodoku_flg,
      ).toBe(false);
    });

    // DB は NOT NULL DEFAULT FALSE だが、部分 select 等で欠けても
    // 「有り」を誤表示しないよう false に倒す。
    it('should fall back to false when honshi_kodoku_flg is missing', () => {
      expect(
        toDokusyaResponse(
          buildDokusya({ honshiKodokuFlg: undefined } as Partial<Dokusya>),
          joins,
        ).honshi_kodoku_flg,
      ).toBe(false);
    });

    it('should coerce a bigint-as-string id to number', () => {
      // TypeORM は bigint 列を string で返す。JSON 契約は numeric を保つ。
      const entity = buildDokusya({
        hanbaitenId: '5' as unknown as number,
        tankaId: '1' as unknown as number,
      } as Partial<Dokusya>);

      const res = toDokusyaResponse(entity, joins);

      expect(res.hanbaiten_id).toBe(5);
      expect(res.tanka_id).toBe(1);
    });
  });

  describe('toDokusyaListItem (SCR-014 一覧)', () => {
    it('should serialize NULL hanbaiten_id as null (not 0)', () => {
      expect(toDokusyaListItem({ hanbaiten_id: null }).hanbaiten_id).toBeNull();
    });

    it('should keep a real hanbaiten_id', () => {
      expect(toDokusyaListItem({ hanbaiten_id: '7' }).hanbaiten_id).toBe(7);
    });
  });

  describe('toDokusyaRirekiListItem (SCR-013 履歴)', () => {
    it('should serialize NULL hanbaiten_id / tanka_id as null (not 0)', () => {
      const item = toDokusyaRirekiListItem({
        hanbaiten_id: null,
        tanka_id: null,
      });

      expect(item.hanbaiten_id).toBeNull();
      expect(item.tanka_id).toBeNull();
    });

    it('should keep real ids', () => {
      const item = toDokusyaRirekiListItem({ hanbaiten_id: '7', tanka_id: '3' });

      expect(item.hanbaiten_id).toBe(7);
      expect(item.tanka_id).toBe(3);
    });
  });

  describe('toReplaceSearchItem (SCR-015 販売店入替検索)', () => {
    it('should serialize NULL hanbaiten_id as null (not 0)', () => {
      expect(toReplaceSearchItem({ hanbaiten_id: null }).hanbaiten_id).toBeNull();
    });

    it('should keep a real hanbaiten_id', () => {
      expect(toReplaceSearchItem({ hanbaiten_id: 7 }).hanbaiten_id).toBe(7);
    });
  });

  // NOT NULL 列まで nullable 化しないことの確認（過剰修正の防止）。
  it('should still emit 0-able NOT NULL columns as numbers', () => {
    const entity = buildDokusya({
      dokusyaShubetsu: 2,
      shiharaiHoho: 6,
      dokusyaBusu: 1,
    } as Partial<Dokusya>);

    const res = toDokusyaResponse(entity, joins);

    expect(res.dokusya_shubetsu).toBe(2);
    expect(res.shiharai_hoho).toBe(6);
    expect(res.dokusya_busu).toBe(1);
  });
});

/**
 * 顧客DB設計 2026-08 の従属 4 項目。親の分類が条件コードを含むときだけ値を持てる
 * （列 COMMENT の「〜の場合のみ設定可 / 入力可」）。
 *
 * 画面も同じ条件で入力欄を出し分けるが、ここで落とすのは DTO 単体では表現できない
 * 項目間の制約だから。API を直接叩けば「学生なのに ja_yakushokuin_flg=true」を
 * 送れてしまい、その組合せは電子版 push で V26〜V30 を踏んで create/update ごと
 * 失敗する（denshiban-push.mapper.ts）。保存を許すと「画面では登録できたのに
 * 電子版だけ同期されない」形の不整合になるため、保存時点で落とす。
 */
describe('buildBunruiPayload', () => {
  it('農業者(0) なら かつJAグループ役職員 を保存する', () => {
    expect(
      buildBunruiPayload({ dokusyaso_bunrui: '0', ja_yakushokuin_flg: true }),
    ).toMatchObject({ dokusyasoBunrui: '0', jaYakushokuinFlg: true });
  });

  it('農業者(0) 以外なら かつJAグループ役職員 を false へ落とす', () => {
    expect(
      buildBunruiPayload({ dokusyaso_bunrui: '3', ja_yakushokuin_flg: true })
        .jaYakushokuinFlg,
    ).toBe(false);
  });

  it('企業・団体(2) なら 農業関係 を保存する', () => {
    expect(
      buildBunruiPayload({ dokusyaso_bunrui: '2', nogyo_kankei_flg: true })
        .nogyoKankeiFlg,
    ).toBe(true);
  });

  it('企業・団体(2) 以外なら 農業関係 を false へ落とす', () => {
    expect(
      buildBunruiPayload({ dokusyaso_bunrui: '0', nogyo_kankei_flg: true })
        .nogyoKankeiFlg,
    ).toBe(false);
  });

  it('その他(999) なら 読者属性その他 を保存する', () => {
    expect(
      buildBunruiPayload({
        dokusyaso_bunrui: '999',
        dokusyaso_bunrui_sonota: '自営業',
      }).dokusyasoBunruiSonota,
    ).toBe('自営業');
  });

  it('その他(999) 以外なら 読者属性その他 を空へ落とす', () => {
    expect(
      buildBunruiPayload({
        dokusyaso_bunrui: '1',
        dokusyaso_bunrui_sonota: '自営業',
      }).dokusyasoBunruiSonota,
    ).toBe('');
  });

  it('主な生産物に その他(999) を含むなら 主な生産物その他 を保存する', () => {
    expect(
      buildBunruiPayload({
        dokusyaso_bunrui: '0',
        nogyosya_bunrui: '0,999',
        nogyosya_bunrui_sonota: 'きのこ',
      }).nogyosyaBunruiSonota,
    ).toBe('きのこ');
  });

  it('主な生産物に その他 が無ければ 主な生産物その他 を空へ落とす', () => {
    expect(
      buildBunruiPayload({
        dokusyaso_bunrui: '0',
        nogyosya_bunrui: '0,1',
        nogyosya_bunrui_sonota: 'きのこ',
      }).nogyosyaBunruiSonota,
    ).toBe('');
  });

  it('未指定は既定値（false / 空文字）で埋める — 列が NOT NULL のため', () => {
    expect(buildBunruiPayload({})).toEqual({
      dokusyasoBunrui: '',
      jaYakushokuinFlg: false,
      nogyoKankeiFlg: false,
      dokusyasoBunruiSonota: '',
      nogyosyaBunrui: '',
      nogyosyaBunruiSonota: '',
    });
  });
});

/**
 * SCR-016 Excel 取込の従属 4 項目（顧客要件 2026-08）。
 *
 * 取込は buildBunruiPayload を通す（新規モード）。取込だけ素通しにすると、画面
 * (SCR-011) では作れない組合せが Excel から入ってしまう。ここは取込 service が
 * 渡す形（Excel セル由来の値）で通ることを確かめる。
 */
describe('buildBunruiPayload — Excel 取込由来の値', () => {
  it('should accept boolean cells coerced from Excel TRUE/FALSE', () => {
    expect(
      buildBunruiPayload({
        dokusyaso_bunrui: '0',
        ja_yakushokuin_flg: true,
        nogyo_kankei_flg: false,
      }),
    ).toMatchObject({ jaYakushokuinFlg: true, nogyoKankeiFlg: false });
  });

  it('should treat an omitted flag column as false (列未選択・空欄)', () => {
    // 列が NOT NULL なので undefined のまま渡すわけにいかない。
    expect(
      buildBunruiPayload({ dokusyaso_bunrui: '0' }).jaYakushokuinFlg,
    ).toBe(false);
  });

  it('should drop 従属項目 that the imported 読者属性 does not allow', () => {
    // 学生(3) はどの従属項目も持てない。Excel に値が入っていても落とす。
    expect(
      buildBunruiPayload({
        dokusyaso_bunrui: '3',
        ja_yakushokuin_flg: true,
        nogyo_kankei_flg: true,
        dokusyaso_bunrui_sonota: '自営業',
      }),
    ).toMatchObject({
      jaYakushokuinFlg: false,
      nogyoKankeiFlg: false,
      dokusyasoBunruiSonota: '',
    });
  });
});
