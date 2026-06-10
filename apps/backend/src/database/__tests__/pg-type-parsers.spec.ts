import { configurePgTypeParsers } from '@/database/pg-type-parsers';

interface PgTypes {
  builtins: { DATE: number };
  getTypeParser(oid: number): (value: string) => unknown;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { types } = require('pg') as { types: PgTypes };

describe('configurePgTypeParsers', () => {
  it('returns DATE (OID 1082) values verbatim as YYYY-MM-DD strings (no JS Date / no TZ shift)', () => {
    // Regression — pg's default DATE parser builds a JS Date at the
    // container-local (Asia/Tokyo) midnight, which serializes to the
    // previous-day UTC instant and shows DB=19 as 18 on the edit screen.
    configurePgTypeParsers();
    const parse = types.getTypeParser(types.builtins.DATE);
    expect(parse('2026-05-19')).toBe('2026-05-19');
    // No Date object, no off-by-one.
    expect(typeof parse('2026-05-19')).toBe('string');
  });
});
