import { describe, expect, it } from 'vitest';
import { createApp } from 'vue';

import { ANTD_COMPONENTS, installAntd } from '@/plugins/antd';

// src 配下の全 .vue を生テキストで取り込む。node:fs だと FE の tsconfig に
// @types/node が無く型エラーになるので、Vite の glob import を使う。
const VUE_SOURCES = import.meta.glob('../../**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** 全 .vue のテンプレートで使われている `<a-xxx>` タグを集める。 */
function collectAntdTags(): string[] {
  const tags = new Set<string>();
  for (const source of Object.values(VUE_SOURCES)) {
    for (const match of source.matchAll(/<(a-[a-z0-9-]+)/g)) {
      tags.add(match[1]);
    }
  }
  return [...tags].sort();
}

/** `a-form-item` → `AFormItem` — Vue のコンポーネント名解決に合わせる。 */
function toPascalCase(tag: string): string {
  const camel = tag.replace(/-(\w)/g, (_, char: string) => char.toUpperCase());
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

describe('plugins/antd', () => {
  it('should expose an install function on every registered component', () => {
    // install を持たないオブジェクトを `app.use()` に渡すと dev では警告が出るが、
    // 本番ビルドでは黙って無視される — 登録漏れが画面の消失として現れる。
    for (const component of ANTD_COMPONENTS) {
      expect(typeof (component as { install?: unknown }).install).toBe('function');
    }
  });

  it('should register every <a-*> tag used in .vue templates', () => {
    const tags = collectAntdTags();
    // glob が空 = パターン崩れ。その状態だと missing も空になり、テストが
    // 何も検証しないまま緑になるのでここで落とす。
    expect(tags.length).toBeGreaterThan(0);

    const app = createApp({ template: '<div />' });
    installAntd(app);
    const registered = new Set(Object.keys(app._context.components));

    const missing = tags.filter(
      (tag) => !registered.has(tag) && !registered.has(toPascalCase(tag)),
    );

    // 失敗したら src/plugins/antd.ts の ANTD_COMPONENTS へ親コンポーネントを追加する。
    expect(missing).toEqual([]);
  });
});
