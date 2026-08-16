// Drives src/common/decorators/data-scope.decorator.ts.
//
// Regression (backend code review finding #11): extractDataScope()
// previously read request.user.roleCode / .jaId / .kanriShitenId
// (camelCase), but SessionAuthGuard attaches SessionPayload with
// role_code / ja_id / kanri_shiten_id (snake_case). The decorator always
// resolved to an empty/unrestricted scope ({ roleCode: '', jaId: null,
// kanriShitenId: null }) regardless of the actual session — currently
// dead code (zero call sites), but a landmine for whichever controller
// adopts @GetDataScope() first, expecting it to actually scope.
//
// extractDataScope() is exported as a plain function specifically so it
// can be unit tested directly, without NestJS's ExecutionContext/
// reflection machinery that createParamDecorator wraps around it.

import { extractDataScope } from './data-scope.decorator';
import { buildSession, buildJaKanriShitenSession } from '@test/fixtures/session.factory';

describe('extractDataScope', () => {
  it('should read role_code / ja_id / kanri_shiten_id from the SessionPayload (snake_case)', () => {
    const session = buildJaKanriShitenSession({ ja_id: 7, kanri_shiten_id: 30 });
    const scope = extractDataScope({ user: session });

    expect(scope).toEqual({
      roleCode: 'JA_KANRI_SHITEN',
      jaId: 7,
      kanriShitenId: 30,
    });
  });

  it('should resolve jaId/kanriShitenId to null for an unrestricted role (NICHINO_ADMIN)', () => {
    const session = buildSession(); // ja_id: null, kanri_shiten_id: null
    const scope = extractDataScope({ user: session });

    expect(scope).toEqual({
      roleCode: 'NICHINO_ADMIN',
      jaId: null,
      kanriShitenId: null,
    });
  });

  it('should return an empty/unrestricted scope when request.user is missing (defensive default)', () => {
    const scope = extractDataScope({});

    expect(scope).toEqual({ roleCode: '', jaId: null, kanriShitenId: null });
  });
});
