/**
 * Centralized BullMQ queue names. Producer + worker import from here so a
 * rename is a one-file change and there is no string drift between the
 * `queue.add(...)` and `@Processor(...)` call sites.
 */
export const QUEUE_FILE_UPLOAD_NOTIFICATION = 'file-upload-notification';
