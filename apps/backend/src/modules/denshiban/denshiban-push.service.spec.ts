import { DokusyaShubetsu } from '@/common/enums';
import { todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';

import { DenshibanApiService } from './denshiban-api.service';
import {
  DenshibanPushException,
  DenshibanPushService,
} from './denshiban-push.service';

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
    tatemonoMei: '',
    renrakusaki1: '0312345678',
    email: 'taro@example.com',
    honshiKodokuFlg: true,
    mailMagazineFlg: 1,
    birthYear: 1980,
    gender: 1,
    dokusyasoBunrui: '0',
    nogyosyaBunrui: '',
    biko: '',
    tankaId: null,
    ...overrides,
  } as Dokusya;
}

/** manager.getRepository を KanriShiten / Tanka で振り分けるモックを作る。 */
function buildManager(opts: {
  kanriShitenCode?: string | null;
  campaignFlg?: boolean;
} = {}) {
  const kanriRepo = {
    findOne: jest.fn().mockResolvedValue(
      opts.kanriShitenCode === null
        ? null
        : { kanriShitenId: 3, kanriShitenCode: opts.kanriShitenCode ?? '1301002001' },
    ),
  };
  const tankaRepo = {
    findOne: jest.fn().mockResolvedValue({ campaignFlg: opts.campaignFlg ?? false }),
  };
  const update = jest.fn().mockResolvedValue(undefined);
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === KanriShiten ? kanriRepo : tankaRepo,
    ),
    update,
  };
  return { manager: manager as any, update, kanriRepo, tankaRepo };
}

function buildService(enabled: boolean, api: Partial<DenshibanApiService> = {}) {
  const configService = {
    get: jest.fn((key: string) =>
      key === 'denshiban.pushEnabled' ? enabled : undefined,
    ),
  };
  return new DenshibanPushService(
    api as DenshibanApiService,
    configService as any,
  );
}

describe('DenshibanPushService', () => {
  describe('isTarget', () => {
    it('push 無効なら false', async () => {
      const service = buildService(false);
      const { manager } = buildManager();
      expect(await service.isTarget(manager, buildDokusya(), 'UI')).toBe(false);
    });

    it("source==='BATCH'（pull の押し戻し）は echo 防止で false", async () => {
      const service = buildService(true);
      const { manager } = buildManager();
      expect(await service.isTarget(manager, buildDokusya(), 'BATCH')).toBe(false);
    });

    it('紙版(1) は対象外', async () => {
      const service = buildService(true);
      const { manager } = buildManager();
      const paper = buildDokusya({ dokusyaShubetsu: DokusyaShubetsu.PAPER });
      expect(await service.isTarget(manager, paper, 'UI')).toBe(false);
    });

    it('campaign 単価の会員は対象外', async () => {
      const service = buildService(true);
      const { manager } = buildManager({ campaignFlg: true });
      const withCampaign = buildDokusya({ tankaId: 99 });
      expect(await service.isTarget(manager, withCampaign, 'UI')).toBe(false);
    });

    it('電子版 + 非campaign + UI は対象', async () => {
      const service = buildService(true);
      const { manager } = buildManager({ campaignFlg: false });
      expect(await service.isTarget(manager, buildDokusya({ tankaId: 5 }), 'UI')).toBe(
        true,
      );
    });
  });

  // 顧客要件 2026-08 追補: campaign→通常 単価へ切替えた直後（denshi_kaiin_id が
  // まだ null）は、この1回の更新では push しない — cloud が denshiban へ新規
  // 登録してしまうのを防ぐ（denshi_kaiin_id の付与は pull sync のみを正とする）。
  // push有効化前から存在し一度も campaign になったことがない「migration対象」
  // レコード（beforeTankaId も非campaign）とは区別する。
  describe('isTarget — beforeTankaId（campaign→通常 切替時の初回push抑止）', () => {
    /** tankaId → campaignFlg のマップで振り分ける Tanka repo モック。 */
    function buildManagerWithTankaRoute(campaignByTankaId: Record<number, boolean>) {
      const kanriRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ kanriShitenId: 3, kanriShitenCode: '1301002001' }),
      };
      const tankaRepo = {
        findOne: jest.fn(async (opts: { where?: { tankaId?: number } }) => {
          const id = opts?.where?.tankaId;
          return { campaignFlg: (id != null && campaignByTankaId[id]) ?? false };
        }),
      };
      const manager = {
        getRepository: jest.fn((entity: unknown) =>
          entity === KanriShiten ? kanriRepo : tankaRepo,
        ),
        update: jest.fn(),
      };
      return manager as any;
    }

    it('should skip push when switching from a campaign tanka to a regular one while denshi_kaiin_id is still null', async () => {
      const service = buildService(true);
      const manager = buildManagerWithTankaRoute({ 1: false, 2: true }); // 1=通常, 2=campaign
      const after = buildDokusya({ tankaId: 1, denshiKaiinId: null });
      expect(await service.isTarget(manager, after, 'UI', 2)).toBe(false);
    });

    it('should push when neither before nor after tanka was ever campaign (pre-push migration record)', async () => {
      const service = buildService(true);
      const manager = buildManagerWithTankaRoute({ 1: false });
      const after = buildDokusya({ tankaId: 1, denshiKaiinId: null });
      expect(await service.isTarget(manager, after, 'UI', 1)).toBe(true);
    });

    it('should push normally when denshi_kaiin_id is already set, regardless of beforeTankaId being campaign', async () => {
      const service = buildService(true);
      const manager = buildManagerWithTankaRoute({ 1: false, 2: true });
      const after = buildDokusya({ tankaId: 1, denshiKaiinId: 555 });
      expect(await service.isTarget(manager, after, 'UI', 2)).toBe(true);
    });

    it('should still exclude when the current (after) tanka itself is campaign, regardless of beforeTankaId', async () => {
      const service = buildService(true);
      const manager = buildManagerWithTankaRoute({ 1: false, 2: true });
      const after = buildDokusya({ tankaId: 2, denshiKaiinId: null }); // after が campaign
      expect(await service.isTarget(manager, after, 'UI', 1)).toBe(false);
    });

    it('should behave as before when beforeTankaId is omitted (create など before が無い呼び出し)', async () => {
      const service = buildService(true);
      const manager = buildManagerWithTankaRoute({ 1: false });
      const after = buildDokusya({ tankaId: 1, denshiKaiinId: null });
      expect(await service.isTarget(manager, after, 'UI')).toBe(true);
    });
  });

  describe('push', () => {
    it("create 成功で採番IDを返し master.denshi_kaiin_id を書き戻す", async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: '0', id: '777', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager, update } = buildManager();

      const id = await service.push(manager, 'create', buildDokusya());

      expect(id).toBe(777);
      expect(updateUserInfo).toHaveBeenCalledWith(
        'create',
        expect.objectContaining({ jacd_execute: '1301002001', payment_start: '0' }),
      );
      expect(update).toHaveBeenCalledWith(Dokusya, 10, { denshiKaiinId: 777 });
    });

    it('statusCode≠"0" は DenshibanPushException を throw（→ tx rollback）', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: 'V15', id: '', message: 'email invalid' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(service.push(manager, 'create', buildDokusya())).rejects.toBeInstanceOf(
        DenshibanPushException,
      );
    });

    it('電子版が返した message をそのまま利用者向け message にする', async () => {
      const updateUserInfo = jest.fn().mockResolvedValue({
        statusCode: 'V15',
        id: '',
        message: 'メールアドレスが既に登録されています。',
      });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(service.push(manager, 'create', buildDokusya())).rejects.toThrow(
        'メールアドレスが既に登録されています。',
      );
    });

    it('message が空なら Excel のコード説明にフォールバックする', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: 'E01', id: '', message: '   ' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(service.push(manager, 'create', buildDokusya())).rejects.toThrow(
        'リクエストBodyのJSONのパースに失敗',
      );
    });

    it('未知コード（Excel 一覧に無い）は汎用文言へフォールバックする', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: 'Z99', id: '', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(
        service.push(manager, 'create', buildDokusya()),
      ).rejects.toMatchObject({
        // 先方コード書式に合わないので error_code は cloud 側の既定コード
        code: 'DENSHIBAN_PUSH_FAILED',
        message: '電子版システムとの連携に失敗しました。時間をおいて再度お試しください。',
      });
    });

    it('error_code は電子版が返したコードをそのまま使う（Excel エラーコード一覧）', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: 'P01', id: '', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(
        service.push(manager, 'create', buildDokusya()),
      ).rejects.toMatchObject({
        code: 'P01',
        // message 空なら Excel の説明文へフォールバック
        message: '【create】メールアドレスが重複している',
      });
    });

    it('cloud 起点の失敗は error_code=DENSHIBAN_PUSH_FAILED のまま', async () => {
      const updateUserInfo = jest.fn();
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager({ kanriShitenCode: '130-1002' });

      await expect(
        service.push(manager, 'update', buildDokusya()),
      ).rejects.toMatchObject({ code: 'DENSHIBAN_PUSH_FAILED' });
      expect(updateUserInfo).not.toHaveBeenCalled();
    });

    it('失敗時は pushDetail に action/statusCode/message を残す（調査用）', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: 'V15', id: '', message: 'email invalid' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(
        service.push(manager, 'create', buildDokusya()),
      ).rejects.toMatchObject({
        pushDetail: 'action=create statusCode=V15 message=email invalid',
      });
    });

    it('update は id + action=update で呼ぶ', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: '0', id: '', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await service.push(manager, 'update', buildDokusya({ denshiKaiinId: 555 }));

      expect(updateUserInfo).toHaveBeenCalledWith(
        'update',
        expect.objectContaining({ id: '555', notify_flg: '0' }),
      );
    });

    it('approve は id + payment_start で呼ぶ', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: '0', id: '', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await service.push(manager, 'approve', buildDokusya({ denshiKaiinId: 555 }));

      expect(updateUserInfo).toHaveBeenCalledWith(
        'approve',
        expect.objectContaining({ id: '555', payment_start: '0' }),
      );
    });

    it('update で denshi_kaiin_id が null なら create にフォールバックし id を書き戻す', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: '0', id: '999', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager, update } = buildManager();

      const id = await service.push(
        manager,
        'update',
        buildDokusya({ denshiKaiinId: null }),
      );

      expect(id).toBe(999);
      expect(updateUserInfo).toHaveBeenCalledWith('create', expect.any(Object));
      expect(update).toHaveBeenCalledWith(Dokusya, 10, { denshiKaiinId: 999 });
    });

    it('approve/unapprove で denshi_kaiin_id が null なら skip（throw せず・cloud を止めない）', async () => {
      const updateUserInfo = jest.fn();
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await expect(
        service.push(manager, 'approve', buildDokusya({ denshiKaiinId: null })),
      ).resolves.toBeNull();
      await expect(
        service.push(manager, 'unapprove', buildDokusya({ denshiKaiinId: null })),
      ).resolves.toBeNull();
      expect(updateUserInfo).not.toHaveBeenCalled();
    });

    it('kanri_shiten_code が10桁でないと throw（JACd 未解決）', async () => {
      const updateUserInfo = jest.fn();
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager({ kanriShitenCode: '130-1002' });

      await expect(service.push(manager, 'update', buildDokusya())).rejects.toBeInstanceOf(
        DenshibanPushException,
      );
      expect(updateUserInfo).not.toHaveBeenCalled();
    });
  });

  describe('pushOnWrite (UI/取込 ファサード)', () => {
    it('未来適用（immediateJohoDate≠当日）は push しない', async () => {
      const updateUserInfo = jest.fn();
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await service.pushOnWrite(manager, {
        action: 'update',
        after: buildDokusya(),
        source: 'UI',
        immediateJohoDate: '2000-01-01',
      });

      expect(updateUserInfo).not.toHaveBeenCalled();
    });

    it("source==='BATCH'（pull echo）は push しない", async () => {
      const updateUserInfo = jest.fn();
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();

      await service.pushOnWrite(manager, {
        action: 'update',
        after: buildDokusya(),
        source: 'BATCH',
      });

      expect(updateUserInfo).not.toHaveBeenCalled();
    });

    it('当日適用 + 対象なら push し、create は denshi_kaiin_id を entity へ書き戻す', async () => {
      const updateUserInfo = jest
        .fn()
        .mockResolvedValue({ statusCode: '0', id: '888', message: '' });
      const service = buildService(true, { updateUserInfo });
      const { manager } = buildManager();
      const after = buildDokusya({ denshiKaiinId: null });

      await service.pushOnWrite(manager, {
        action: 'create',
        after,
        source: 'UI',
        immediateJohoDate: todayIsoJst(),
      });

      expect(updateUserInfo).toHaveBeenCalledWith('create', expect.any(Object));
      expect(after.denshiKaiinId).toBe(888);
    });
  });
});
