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

    it('備考 255 文字超は切り詰め・改行は空白へ', () => {
      const long = 'あ'.repeat(300);
      const p = toCreatePayload(buildDokusya({ biko: `1行目\n2行目` }), '1301002001');
      expect(p.remarks1).toBe('1行目 2行目');
      const p2 = toCreatePayload(buildDokusya({ biko: long }), '1301002001');
      expect(p2.remarks1 ?? '').toHaveLength(255);
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
