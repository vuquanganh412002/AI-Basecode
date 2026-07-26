import {
  isCampaignContract,
  isDenshibanSubscriber,
  resolveDenshibanSyncGate,
  type DenshibanSyncCandidate,
} from '@/common/utils/denshiban-sync-gate';
import { Tanka } from '@/database/entities/tanka.entity';

/** m_tanka の findOne だけを持つ最小リポジトリモック。 */
function buildTankaRepo(row: Partial<Tanka> | null): any {
  return { findOne: jest.fn().mockResolvedValue(row) };
}

/** `getRepository(Tanka)` が上記リポジトリを返す EntityManager モック。 */
function buildManager(row: Partial<Tanka> | null): any {
  const repo = buildTankaRepo(row);
  return { getRepository: jest.fn().mockReturnValue(repo), __repo: repo };
}

function candidate(
  overrides: Partial<DenshibanSyncCandidate> = {},
): DenshibanSyncCandidate {
  return { dokusyaShubetsu: 2, tankaId: 1, ...overrides } as DenshibanSyncCandidate;
}

describe('isDenshibanSubscriber', () => {
  it('電子版(2) のみ true', () => {
    expect(isDenshibanSubscriber(2)).toBe(true);
  });

  it('紙版(1) は false', () => {
    expect(isDenshibanSubscriber(1)).toBe(false);
  });

  it('併読(3) は false — denshiban 側で別経路登録されるため cloud から push しない', () => {
    expect(isDenshibanSubscriber(3)).toBe(false);
  });
});

describe('isCampaignContract', () => {
  it('campaign_flg = true なら true', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: true });
    await expect(isCampaignContract(candidate(), { manager })).resolves.toBe(true);
  });

  it('campaign_flg = false なら false', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: false });
    await expect(isCampaignContract(candidate(), { manager })).resolves.toBe(false);
  });

  it('単価行が見つからなければ false（存在しない単価はキャンペーンではない）', async () => {
    const manager = buildManager(null);
    await expect(isCampaignContract(candidate(), { manager })).resolves.toBe(false);
  });

  it('tankaId 未設定なら DB を読まずに false（送信対象を落とさない側に倒す）', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: true });
    await expect(
      isCampaignContract(candidate({ tankaId: null }), { manager }),
    ).resolves.toBe(false);
    expect(manager.getRepository).not.toHaveBeenCalled();
  });

  it('bigint 由来の文字列 tankaId を数値へ正規化して照会する', async () => {
    const manager = buildManager({ tankaId: 7, campaignFlg: false });
    await isCampaignContract(
      candidate({ tankaId: '7' as unknown as number }),
      { manager },
    );
    expect(manager.__repo.findOne).toHaveBeenCalledWith({ where: { tankaId: 7 } });
  });

  it('manager が渡されていれば tankaRepo より優先する（同一トランザクションで読む）', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: true });
    const fallbackRepo = buildTankaRepo({ tankaId: 1, campaignFlg: false });

    await expect(
      isCampaignContract(candidate(), { manager, tankaRepo: fallbackRepo }),
    ).resolves.toBe(true);
    expect(fallbackRepo.findOne).not.toHaveBeenCalled();
  });

  it('manager が無ければ tankaRepo にフォールバックする', async () => {
    const tankaRepo = buildTankaRepo({ tankaId: 1, campaignFlg: true });
    await expect(isCampaignContract(candidate(), { tankaRepo })).resolves.toBe(true);
  });

  it('読み口が未配線なら例外を投げる（判定不能を「送信可」にしない）', async () => {
    await expect(isCampaignContract(candidate(), {})).rejects.toThrow(
      /キャンペーン単価の判定が未配線です/,
    );
  });
});

describe('resolveDenshibanSyncGate', () => {
  it('電子版(2)＋非キャンペーン単価 は eligible', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: false });
    await expect(resolveDenshibanSyncGate(candidate(), { manager })).resolves.toEqual({
      eligible: true,
    });
  });

  it('紙版(1) は not_digital_only で弾く', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: false });
    await expect(
      resolveDenshibanSyncGate(candidate({ dokusyaShubetsu: 1 }), { manager }),
    ).resolves.toEqual({ eligible: false, reason: 'not_digital_only' });
  });

  it('併読(3) は not_digital_only で弾く', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: false });
    await expect(
      resolveDenshibanSyncGate(candidate({ dokusyaShubetsu: 3 }), { manager }),
    ).resolves.toEqual({ eligible: false, reason: 'not_digital_only' });
  });

  it('電子版でもキャンペーン単価なら campaign_tanka で弾く', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: true });
    await expect(resolveDenshibanSyncGate(candidate(), { manager })).resolves.toEqual({
      eligible: false,
      reason: 'campaign_tanka',
    });
  });

  it('種別チェックを先に評価する — 対象外購読者では m_tanka を読まない', async () => {
    const manager = buildManager({ tankaId: 1, campaignFlg: true });
    await resolveDenshibanSyncGate(candidate({ dokusyaShubetsu: 1 }), { manager });
    expect(manager.getRepository).not.toHaveBeenCalled();
  });

  it('種別が対象外なら読み口が未配線でも例外を投げない', async () => {
    await expect(
      resolveDenshibanSyncGate(candidate({ dokusyaShubetsu: 1 }), {}),
    ).resolves.toEqual({ eligible: false, reason: 'not_digital_only' });
  });
});
