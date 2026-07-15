// 所属支店スコープ（3層目・顧客要件 2026-07）のユニットテスト。
// session.shiten_id が null のとき no-op、非null で一致必須（不一致は 404/403）。

import {
  applyShitenScope,
  assertShitenScope,
  assertShitenScopeViolation,
} from '@/common/utils/data-scope';
import { DataScopeViolationException } from '@/common/exceptions/common.exceptions';
import { buildJaKanriShitenSession } from '@test/fixtures/session.factory';

describe('data-scope — 所属支店(shiten_id)', () => {
  describe('assertShitenScope (404 mask)', () => {
    it('should be a no-op when session.shiten_id is null (従来動作)', () => {
      const session = buildJaKanriShitenSession({ shiten_id: null });
      expect(() => assertShitenScope(999, session)).not.toThrow();
    });

    it('should pass when the record shiten_id matches session.shiten_id', () => {
      const session = buildJaKanriShitenSession({ shiten_id: 7 });
      expect(() => assertShitenScope(7, session, '購読者')).not.toThrow();
    });

    it('should throw NotFound (存在マスク) when the record shiten_id differs', () => {
      const session = buildJaKanriShitenSession({ shiten_id: 7 });
      expect(() => assertShitenScope(8, session, '購読者')).toThrow(
        /見つかりません/,
      );
    });
  });

  describe('assertShitenScopeViolation (403 explicit)', () => {
    it('should be a no-op when session.shiten_id is null', () => {
      const session = buildJaKanriShitenSession({ shiten_id: null });
      expect(() => assertShitenScopeViolation(3, session)).not.toThrow();
    });

    it('should throw DataScopeViolation when the record shiten_id differs', () => {
      const session = buildJaKanriShitenSession({ shiten_id: 7 });
      expect(() => assertShitenScopeViolation(8, session)).toThrow(
        DataScopeViolationException,
      );
    });
  });

  describe('applyShitenScope (query builder)', () => {
    function makeQb() {
      return { andWhere: jest.fn().mockReturnThis() } as any;
    }

    it('should NOT add a WHERE clause when session.shiten_id is null', () => {
      const qb = makeQb();
      applyShitenScope(qb, 'd', 'shitenId', buildJaKanriShitenSession({ shiten_id: null }));
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should add `alias.field = :scopeShitenId` when session.shiten_id is set', () => {
      const qb = makeQb();
      applyShitenScope(qb, 'd', 'shitenId', buildJaKanriShitenSession({ shiten_id: 7 }));
      expect(qb.andWhere).toHaveBeenCalledWith('d.shitenId = :scopeShitenId', {
        scopeShitenId: 7,
      });
    });
  });
});
