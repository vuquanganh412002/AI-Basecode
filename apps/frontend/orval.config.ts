import { defineConfig } from 'orval';

/**
 * Output goes under `src/api/generated/` — fully gitignored — so orval
 * never overwrites the hand-written wrappers in `src/api/<tag>/<tag>.ts`
 * that the views import from. Hand-written wrappers re-export the
 * generated functions where the OpenAPI shape is good and add custom
 * shapes (envelope unwrap, type aliases) on top.
 *
 * Use `mode: 'tags-split'` so each backend controller gets its own file
 * under `src/api/generated/<tag>/<tag>.ts`. Schemas are emitted to
 * `src/api/generated/index.schemas.ts`.
 */
export default defineConfig({
  api: {
    input: './swagger.json',
    output: {
      target: './src/api/generated/index.ts',
      client: 'axios',
      mode: 'tags-split',
      override: {
        mutator: {
          path: './src/api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
