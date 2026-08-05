// 共通コンポーネント: 都道府県セレクト。
//
// 検証の主眼は「検索が実際に効くこと」。以前は各画面が <a-select-option> +
// 自前 filter-option（`String(option.children).includes(input)`）を書いており、
// antd-vue 4 では children がスロット(vnode配列)なので比較が常に
// '[object Object]' 相手になり、何を打っても候補0件だった。ここでは props の
// 形だけでなく、実際に入力して候補が絞られることまで見る。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';
import { resetTodofukenCache } from '@/composables/useTodofuken';

vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

const LIST = [
  { todofuken_code: '01', todofuken_name: '北海道' },
  { todofuken_code: '13', todofuken_name: '東京都' },
  { todofuken_code: '14', todofuken_name: '神奈川県' },
];

// マウント済み wrapper。テスト毎に unmount する — 生かしたままだと、共有
// キャッシュ(items)が更新されるたび旧インスタンスも再描画し、body 直下へ
// teleport したドロップダウンを貼り直すため visibleOptions() に混ざる。
// （document.body を空にするだけでは、再描画で戻ってくるので効かない）
let mounted: Array<ReturnType<typeof mount>> = [];

beforeEach(async () => {
  vi.clearAllMocks();
  resetTodofukenCache();
  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue({ data: LIST });
});

afterEach(() => {
  mounted.forEach((w) => w.unmount());
  mounted = [];
  document.body.innerHTML = '';
});

async function renderSelect(props: Record<string, unknown> = {}) {
  const wrapper = mount(BaseTodofukenSelect, {
    props: { open: true, ...props },
    attachTo: document.body,
    global: { plugins: [Antd] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

/** ドロップダウンに今表示されている候補ラベル。 */
function visibleOptions(): string[] {
  return Array.from(document.querySelectorAll('.ant-select-item-option-content')).map(
    (e) => (e.textContent ?? '').trim(),
  );
}

describe('BaseTodofukenSelect', () => {
  it('should fetch the master once and expose every 都道府県 as an option', async () => {
    const wrapper = await renderSelect();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');

    expect(getTodofukenList).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent({ name: 'ASelect' }).props('options')).toHaveLength(3);
  });

  it('should issue a single HTTP call even when several selects are mounted', async () => {
    // 購読者登録は購読者住所と配達先住所の2つを並べる。素直に各自で取ると
    // 同じ GET が2回飛ぶため、共有キャッシュで1回に抑える。
    await renderSelect();
    await renderSelect();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');

    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should label options as "コード 名称" (space separated, no colon)', async () => {
    // 他のマスタ用セレクト（BaseShitenSelect / BaseHanbaitenSelect）が
    // `${code} ${name}` で揃っているので、都道府県だけ区切りを変えない。
    const wrapper = await renderSelect();
    const labels = (
      wrapper.findComponent({ name: 'ASelect' }).props('options') as Array<{ label: string }>
    ).map((o) => o.label);

    expect(labels).toEqual(['01 北海道', '13 東京都', '14 神奈川県']);
  });

  it('should filter the dropdown by name fragment', async () => {
    const wrapper = await renderSelect({ open: true });
    await wrapper.find('input').setValue('東京');
    await flushPromises();

    expect(visibleOptions()).toEqual(['13 東京都']);
  });

  it('should filter the dropdown by code fragment', async () => {
    // 「01」で北海道が引けること — 旧実装ではここが0件になっていた。
    const wrapper = await renderSelect({ open: true });
    await wrapper.find('input').setValue('01');
    await flushPromises();

    expect(visibleOptions()).toEqual(['01 北海道']);
  });

  it('should emit the selected code and its name on change', async () => {
    const wrapper = await renderSelect();
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('change', '13');
    await flushPromises();

    expect(wrapper.emitted('update:value')?.[0]).toEqual(['13']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['13', '東京都']);
  });

  it('should emit an empty string when cleared via allow-clear ×', async () => {
    // 呼び出し側の state はフィルタもフォームも string（空は ''）。undefined や
    // null を流すと初期値と型の両方から外れるので '' に寄せる。
    const wrapper = await renderSelect({ value: '13' });
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('change', undefined);
    await flushPromises();

    expect(wrapper.emitted('update:value')?.[0]).toEqual(['']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['', '']);
  });

  it.each([[''], [null], [undefined]])(
    'should show the placeholder when value is %p',
    async (value) => {
      // antd は '' を「選択済み」として扱い placeholder を出さない。SCR-022 の
      // フィルタ初期値が '' で、都道府県だけプレースホルダが消えていた回帰。
      const wrapper = await renderSelect({ value });

      expect(wrapper.findComponent({ name: 'ASelect' }).props('value')).toBeUndefined();
      expect(document.querySelector('.ant-select-selection-placeholder')?.textContent).toBe(
        '都道府県を選択',
      );
    },
  );

  it('should pass the code through to antd when a value is selected', async () => {
    const wrapper = await renderSelect({ value: '13' });

    expect(wrapper.findComponent({ name: 'ASelect' }).props('value')).toBe('13');
  });

  it('should keep the select usable when the master fetch fails', async () => {
    // 共通 interceptor がトースト済み。画面は空候補で動き続ける。
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    resetTodofukenCache();
    vi.mocked(getTodofukenList).mockRejectedValueOnce(new Error('boom'));

    const wrapper = await renderSelect();

    expect(wrapper.findComponent({ name: 'ASelect' }).props('options')).toEqual([]);
  });
});
