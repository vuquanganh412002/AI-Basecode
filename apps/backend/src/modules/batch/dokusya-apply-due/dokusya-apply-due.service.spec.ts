import { DokusyaApplyDueService } from './dokusya-apply-due.service';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

describe('DokusyaApplyDueService', () => {
  it('should run kaiyaku BEFORE recompute (order guarantee 解約 → 反映)', async () => {
    const calls: string[] = [];
    const kaiyaku = {
      run: jest.fn(async () => {
        calls.push('kaiyaku');
      }),
    };
    const recompute = {
      run: jest.fn(async () => {
        calls.push('recompute');
      }),
    };

    const service = new DokusyaApplyDueService(
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await service.run();

    expect(calls).toEqual(['kaiyaku', 'recompute']);
    expect(kaiyaku.run).toHaveBeenCalledTimes(1);
    expect(recompute.run).toHaveBeenCalledTimes(1);
  });
});
