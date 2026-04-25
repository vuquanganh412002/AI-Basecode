// Fixture builder for __ENTITY__ test data.
// Usage: const t = build__ENTITY__({ name: 'override' });

import { __ENTITY__ } from '../../src/modules/__MODULE__/entities/__MODULE__.entity';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

let seq = 0;
const nextId = () => ++seq;

export function build__ENTITY__(overrides: DeepPartial<__ENTITY__> = {}): __ENTITY__ {
  const id = nextId();
  const now = new Date();
  const base = {
    // Fill in default field values from entity schema
    // e.g. id, code: `TEST-${id}`, name: `Test ${id}`, createdAt: now, updatedAt: now, deletedAt: null
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } as unknown as __ENTITY__;
  return Object.assign(base, overrides);
}

export function build__ENTITY__List(count: number, overrides: DeepPartial<__ENTITY__> = {}): __ENTITY__[] {
  return Array.from({ length: count }, () => build__ENTITY__(overrides));
}
