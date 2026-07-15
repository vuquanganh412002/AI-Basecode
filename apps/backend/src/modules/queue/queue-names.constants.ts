/**
 * Centralized BullMQ queue names. Producer + worker import from here so a
 * rename is a one-file change and there is no string drift between the
 * `queue.add(...)` and `@Processor(...)` call sites.
 */
export const QUEUE_FILE_UPLOAD_NOTIFICATION = 'file-upload-notification';

/**
 * 電子版（顧客システム）会員情報の送信キュー。
 *
 * 業務トランザクションの中で HTTP を叩かない（外部I/OのハングがDBロックを
 * 握り続ける）ため、COMMIT 後に「送る指示」だけをここへ積み、実送信はワーカーが
 * 行う。詳細は `docs/design-vi/Denshiban-mapper/implementation-plan.md` §Pha 2。
 */
export const QUEUE_DENSHIBAN_SYNC = 'denshiban-sync';
