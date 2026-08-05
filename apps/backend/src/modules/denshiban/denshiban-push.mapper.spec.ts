import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaShubetsu } from '@/common/enums';

import {
  toApprovePayload,
  toCreatePayload,
  toUnapprovePayload,
  toUpdatePayload,
} from './denshiban-push.mapper';

/**
 * 電子版デモ (denshiban-demo) の validators.js が要求する形を満たすかを検証する。
 * pull 側 dokusya-sync.mapper の逆変換であることも併せて確認する。
 */
function buildDokusya(overrides: Partial<Dokusya> = {}): Dokusya {
  return {
    dokusyaId: 10,
    denshiKaiinId: 555,
    kanriShitenId: 3,
    dokusyaShubetsu: DokusyaShubetsu.DIGITAL,
    shimeiSei: '田中',
    shimeiMei: '太郎',
    shimeiKanaSei: 'たなか',
    shimeiKanaMei: 'たろう',
    yubinNo: '1234567',
    todofukenCode: '13',
    shikuchoson: '千代田区',
    chomeBanchi: '1-2-3',
    tatemonoMei: 'ビル101',
    renrakusaki1: '03-1234-5678',
    email: 'taro@example.com',
    honshiKodokuFlg: true,
    mailMagazineFlg: 1,
    birthYear: 1980,
    gender: 1,
    dokusyasoBunrui: '0',
    nogyosyaBunrui: '1',
    biko: '備考メモ',
    tankaId: null,
    ...overrides,
  } as Dokusya;
}

describe('denshiban-push.mapper', () => {
  describe('toCreatePayload', () => {
    it('会員プロフィール必須項目 + jacd_execute + payment_start を含む', () => {
      const p = toCreatePayload(buildDokusya(), '1301002001');
      expect(p).toMatchObject({
        first_name: '田中',
        last_name: '太郎',
        first_kana: 'たなか',
        last_kana: 'たろう',
        zip: '1234567',
        pref_id: '13',
        addr: '千代田区',
        city: '1-2-3',
        tel: '0312345678', // ハイフン除去
        email: 'taro@example.com',
        subscribe_flg: '1',
        melmaga: '1',
        profession: '0',
        jacd_execute: '1301002001',
        payment_start: '0',
      });
      // create は id / notify_flg を含まない。
      expect(p).not.toHaveProperty('id');
      expect(p).not.toHaveProperty('notify_flg');
    });

    it('gender 2(女)→sex 0、9→sex 9', () => {
      expect(toCreatePayload(buildDokusya({ gender: 2 }), '1301002001').sex).toBe('0');
      expect(toCreatePayload(buildDokusya({ gender: null }), '1301002001').sex).toBe('9');
    });

    it('honshiKodokuFlg=false → subscribe_flg 0、mailMagazineFlg=0 → melmaga 0', () => {
      const p = toCreatePayload(
        buildDokusya({ honshiKodokuFlg: false, mailMagazineFlg: 0 }),
        '1301002001',
      );
      expect(p.subscribe_flg).toBe('0');
      expect(p.melmaga).toBe('0');
    });

    it('products キーは常に載せる。値を持てるのは profession が 0 を含むときだけ', () => {
      // profession=0 → products 許可
      expect(toCreatePayload(buildDokusya(), '1301002001').products).toBe('1');
      // profession=1（0 を含まない）→ キーは載せるが値は ''（V29 回避）
      const p = toCreatePayload(
        buildDokusya({ dokusyasoBunrui: '1', nogyosyaBunrui: '1' }),
        '1301002001',
      );
      expect(p).toHaveProperty('products');
      expect(p.products).toBe('');
    });

    it('農業者だが 主な生産物 未選択 → products は空文字で送る', () => {
      const p = toCreatePayload(
        buildDokusya({ dokusyasoBunrui: '0', nogyosyaBunrui: '' }),
        '1301002001',
      );
      expect(p.products).toBe('');
    });

    it('update payload にも products キーを含める', () => {
      const p = toUpdatePayload(
        buildDokusya({ dokusyasoBunrui: '1', nogyosyaBunrui: '' }),
        '1301002001',
        555,
      );
      expect(p.products).toBe('');
    });

    it('dokusyaso_bunrui 空 → profession は 999(その他) にフォールバック（0農業者へ誤分類しない）', () => {
      expect(
        toCreatePayload(buildDokusya({ dokusyasoBunrui: '' }), '1301002001').profession,
      ).toBe('999');
    });

    /**
     * 分類は画面・pull バッチ・Excel 取込のいずれも**電子版と同じコード**で保存する
     * （顧客要件 2026-07。旧ラベルデータは一括変換済み）。
     * 未知値は落として 999(その他) にフォールバックし、電子版の V29 を避ける。
     */
    describe('分類コードの変換', () => {
      const professionOf = (bunrui: string): string =>
        toCreatePayload(buildDokusya({ dokusyasoBunrui: bunrui }), '1301002001')
          .profession;

      it.each([
        ['0', '0'],
        ['1', '1'],
        ['2', '2'],
        ['3', '3'],
        ['999', '999'],
      ])('読者属性コード %s → profession %s', (input, code) => {
        expect(professionOf(input)).toBe(code);
      });

      it('複数選択も CSV のまま送る', () => {
        expect(professionOf('0,3')).toBe('0,3');
      });

      it('0(農業者) のとき 主な生産物コードも products として送る', () => {
        const p = toCreatePayload(
          buildDokusya({ dokusyasoBunrui: '0', nogyosyaBunrui: '0,1' }),
          '1301002001',
        );
        expect(p.profession).toBe('0');
        expect(p.products).toBe('0,1');
      });

      it('ラベル保存の旧データは未知値として落とし 999 にフォールバックする', () => {
        expect(professionOf('農業者')).toBe('999');
      });

      it('未知の値は落として 999 にフォールバックする', () => {
        expect(professionOf('謎の分類')).toBe('999');
      });
    });

    /**
     * 顧客DB設計 2026-08 の従属 4 項目。electronic 側では products と同じ
     * 「条件付き項目」で、profession / products が条件コードを含まないのに値を
     * 送ると V26〜V30 で create/update ごと弾かれる（denshiban-demo
     * validators.js の CONDITIONAL 表）。よって「送らない」判定が仕様の一部。
     */
    describe('読者属性の従属項目', () => {
      it('農業者(0) のとき profession_and_ja を 0/1 で送る', () => {
        const checked = toCreatePayload(
          buildDokusya({ dokusyasoBunrui: '0', jaYakushokuinFlg: true }),
          '1301002001',
        );
        expect(checked.profession_and_ja).toBe('1');

        const unchecked = toCreatePayload(
          buildDokusya({ dokusyasoBunrui: '0', jaYakushokuinFlg: false }),
          '1301002001',
        );
        // 未チェックでも '0' を明示する。'' で省略すると電子版は「変更なし」と
        // みなして旧値を残すため、チェックを外した操作が同期されない。
        expect(unchecked.profession_and_ja).toBe('0');
      });

      it('農業者(0) 以外では profession_and_ja を空で送る（V26 回避）', () => {
        const p = toCreatePayload(
          buildDokusya({ dokusyasoBunrui: '3', jaYakushokuinFlg: true }),
          '1301002001',
        );
        expect(p).toHaveProperty('profession_and_ja');
        expect(p.profession_and_ja).toBe('');
      });

      it('企業・団体(2) のとき profession_and_agri を 0/1 で送る', () => {
        expect(
          toCreatePayload(
            buildDokusya({ dokusyasoBunrui: '2', nogyoKankeiFlg: true }),
            '1301002001',
          ).profession_and_agri,
        ).toBe('1');
        expect(
          toCreatePayload(
            buildDokusya({ dokusyasoBunrui: '2', nogyoKankeiFlg: false }),
            '1301002001',
          ).profession_and_agri,
        ).toBe('0');
      });

      it('企業・団体(2) 以外では profession_and_agri を空で送る（V27 回避）', () => {
        expect(
          toCreatePayload(
            buildDokusya({ dokusyasoBunrui: '0', nogyoKankeiFlg: true }),
            '1301002001',
          ).profession_and_agri,
        ).toBe('');
      });

      it('その他(999) のとき others_profession に自由記述を送る', () => {
        expect(
          toCreatePayload(
            buildDokusya({
              dokusyasoBunrui: '999',
              dokusyasoBunruiSonota: '自営業',
            }),
            '1301002001',
          ).others_profession,
        ).toBe('自営業');
      });

      it('その他(999) 以外では others_profession を空で送る（V28 回避）', () => {
        expect(
          toCreatePayload(
            buildDokusya({
              dokusyasoBunrui: '3',
              dokusyasoBunruiSonota: '自営業',
            }),
            '1301002001',
          ).others_profession,
        ).toBe('');
      });

      it('主な生産物に その他(999) を含むとき others_products を送る', () => {
        expect(
          toCreatePayload(
            buildDokusya({
              dokusyasoBunrui: '0',
              nogyosyaBunrui: '0,999',
              nogyosyaBunruiSonota: 'きのこ',
            }),
            '1301002001',
          ).others_products,
        ).toBe('きのこ');
      });

      it('主な生産物に その他 が無ければ others_products を空で送る（V30 回避）', () => {
        expect(
          toCreatePayload(
            buildDokusya({
              dokusyasoBunrui: '0',
              nogyosyaBunrui: '0',
              nogyosyaBunruiSonota: 'きのこ',
            }),
            '1301002001',
          ).others_products,
        ).toBe('');
      });

      /**
       * others_products の条件は電子版側では
       * `isPresent(products) && listHas(products, '999')`。products 自体が
       * profession に 0 を含まないと送れないので、非農業者では products が空に
       * なり others_products も送れない。入力値ではなく**送信値**で判定して
       * いることを担保する。
       */
      it('非農業者なら 主な生産物その他 が入っていても送らない', () => {
        const p = toCreatePayload(
          buildDokusya({
            dokusyasoBunrui: '2',
            nogyosyaBunrui: '999',
            nogyosyaBunruiSonota: 'きのこ',
          }),
          '1301002001',
        );
        expect(p.products).toBe('');
        expect(p.others_products).toBe('');
      });

      it('自由記述は 255 文字で切り詰める', () => {
        const p = toCreatePayload(
          buildDokusya({
            dokusyasoBunrui: '999',
            dokusyasoBunruiSonota: 'あ'.repeat(300),
          }),
          '1301002001',
        );
        expect(p.others_profession).toHaveLength(255);
      });

      it('update payload にも従属 4 項目のキーを含める', () => {
        const p = toUpdatePayload(
          buildDokusya({ dokusyasoBunrui: '0', jaYakushokuinFlg: true }),
          '1301002001',
          555,
        );
        expect(p).toMatchObject({
          profession_and_ja: '1',
          profession_and_agri: '',
          others_profession: '',
        });
        expect(p).toHaveProperty('others_products');
      });
    });

    // 顧客要件 2026-08: biko の行を remarks1〜5 へ割り当てる。pull 側
    // (dokusya-sync.mapper#joinRemarks) が remarks を '\n' で連結して biko を
    // 作るので、その逆変換にあたる。
    it('備考は行ごとに remarks1〜4 へ割り当てる', () => {
      const p = toCreatePayload(
        buildDokusya({ biko: '1行目\n2行目\n3行目\n4行目' }),
        '1301002001',
      );
      expect(p.remarks1).toBe('1行目');
      expect(p.remarks2).toBe('2行目');
      expect(p.remarks3).toBe('3行目');
      expect(p.remarks4).toBe('4行目');
      expect(p).not.toHaveProperty('remarks5');
    });

    it('備考 5行目以降は改行を保ったまま remarks5 へまとめる', () => {
      const p = toCreatePayload(
        buildDokusya({ biko: '1\n2\n3\n4\n5\n6\n7' }),
        '1301002001',
      );
      expect(p.remarks4).toBe('4');
      // 改行を潰すと 電子版→cloud→電子版 の往復で行が失われるため保持する。
      expect(p.remarks5).toBe('5\n6\n7');
    });

    it('備考が1行なら remarks2〜5 はキーごと送らない', () => {
      const p = toCreatePayload(buildDokusya({ biko: 'ひとことだけ' }), '1301002001');
      expect(p.remarks1).toBe('ひとことだけ');
      for (const k of ['remarks2', 'remarks3', 'remarks4', 'remarks5']) {
        expect(p).not.toHaveProperty(k);
      }
    });

    it('備考が空なら remarks は1つも送らない', () => {
      const p = toCreatePayload(buildDokusya({ biko: '' }), '1301002001');
      for (const k of ['remarks1', 'remarks2', 'remarks3', 'remarks4', 'remarks5']) {
        expect(p).not.toHaveProperty(k);
      }
    });

    it('remarks は各スロット 255 文字で切り詰める', () => {
      const long = 'あ'.repeat(300);
      const p = toCreatePayload(
        buildDokusya({ biko: `${long}\n${long}` }),
        '1301002001',
      );
      expect(p.remarks1).toHaveLength(255);
      expect(p.remarks2).toHaveLength(255);
    });

    it('CRLF 改行でも行として分割する（Excel 取込由来の備考）', () => {
      const p = toCreatePayload(
        buildDokusya({ biko: '1行目\r\n2行目' }),
        '1301002001',
      );
      expect(p.remarks1).toBe('1行目');
      expect(p.remarks2).toBe('2行目');
    });
  });

  describe('toUpdatePayload', () => {
    it('id + notify_flg + プロフィール項目を含む', () => {
      const p = toUpdatePayload(buildDokusya(), '1301002001', 555);
      expect(p).toMatchObject({ id: '555', notify_flg: '0', first_name: '田中' });
      expect(p).not.toHaveProperty('payment_start');
    });
  });

  describe('toApprovePayload / toUnapprovePayload', () => {
    it('id + payment_start のみ（同一シグネチャ）', () => {
      const approve = toApprovePayload('1301002001', 555);
      expect(approve).toEqual({ jacd_execute: '1301002001', id: '555', payment_start: '0' });
      expect(toUnapprovePayload('1301002001', 555)).toEqual(approve);
    });
  });

});
