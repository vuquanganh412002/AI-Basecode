/**
 * BullMQ キュー名の一元管理。producer + worker がここから import するので、改名は
 * 1 ファイル変更で済み、`queue.add(...)` と `@Processor(...)` の間で文字列ドリフトが
 * 起きない。
 */
export const QUEUE_FILE_UPLOAD_NOTIFICATION = 'file-upload-notification';
