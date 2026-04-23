import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './swagger.json',
    output: {
      target: './src/api/generated.ts',
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
