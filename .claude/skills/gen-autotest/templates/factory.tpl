// Test data factory for {{Entity}}
// Used by /gen-autotest-generated specs. Faker seeds may be set via env (FAKER_SEED).

import { faker } from '@faker-js/faker';
import { {{Entity}} } from '../../src/modules/{{domain}}/entities/{{entity}}.entity';

export interface SessionPayloadMock {
  account_id: number;
  login_id: string;
  role_id: number;
  role_code: 'NICHINO_ADMIN' | 'NICHINO_STAFF' | 'CHUOKAI' | 'JA_HONTEN' | 'JA_KANRI_SHITEN';
  ja_id: number | null;
  kanri_shiten_id: number | null;
  todofuken_code: string | null;
  paper_flg: boolean;
  denshi_flg: boolean;
  email: string;
  permissions: string[];
}

export function create{{Entity}}Mock(overrides: Partial<{{Entity}}> = {}): {{Entity}} {
  return {
    id: faker.number.int({ min: 1, max: 100000 }),
    // {{ENTITY_FAKE_FIELDS}}
    ja_id: 1,
    deleted_at: null,
    created_at: faker.date.past(),
    created_by: 'tester',
    updated_at: faker.date.recent(),
    updated_by: 'tester',
    ...overrides,
  } as {{Entity}};
}

export function createSessionPayloadMock(overrides: Partial<SessionPayloadMock> = {}): SessionPayloadMock {
  return {
    account_id: 1,
    login_id: 'tester',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: true,
    denshi_flg: false,
    email: 'tester@agrinews.test',
    permissions: [
      '{{permission_view}}',
      '{{permission_create}}',
      '{{permission_update}}',
      '{{permission_delete}}',
    ],
    ...overrides,
  };
}
