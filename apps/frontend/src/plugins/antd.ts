import type { App, Plugin } from 'vue';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Pagination,
  Radio,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

/**
 * 画面で実際に使う Ant Design Vue コンポーネントだけをグローバル登録する。
 *
 * `app.use(Antd)`（ライブラリ全体の一括登録）だと未使用コンポーネントも
 * バンドルに残り、antd チャンクが 1,457 kB / gzip 447 kB まで膨らんでいた。
 * 個別 import に変えると tree-shaking が効いて 907 kB / gzip 280 kB
 * （初回ロードで gzip -167 kB）。テンプレート側は今までどおり `<a-input>` の
 * ようなグローバルタグで書けるので、画面ファイルの変更は不要。
 *
 * 親コンポーネントの `install` が子タグもまとめて登録する（`Form` →
 * `<a-form-item>` / `<a-form-item-rest>`、`Input` → `<a-textarea>` /
 * `<a-input-password>`、`Select` → `<a-select-option>` など）ので、
 * このリストはタグ数より短い。
 *
 * 新しい `<a-xxx>` タグを使うときはここに追加する。忘れると本番ビルドでは
 * 警告すら出ずコンポーネントが消える（Vue の未解決コンポーネント警告は dev
 * ビルドのみ）ため、`__tests__/antd.spec.ts` が全 .vue を走査して未登録タグを
 * CI で落とす。
 */
export const ANTD_COMPONENTS: Plugin[] = [
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Pagination,
  Radio,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
];

/** `ANTD_COMPONENTS` をアプリへ一括登録する。 */
export function installAntd(app: App): void {
  ANTD_COMPONENTS.forEach((component) => app.use(component));
}
