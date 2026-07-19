/**
 * A **business error** returned by denshiban's common API `updateUserInfo`.
 *
 * ⚠️ This API **always returns HTTP 200**. Success/failure appears only in the
 * body's `statusCode` (never judge by `res.ok`). {@link DenshibanApiService.send}
 * throws this exception when `statusCode !== '0'`.
 *
 * The denshiban `statusCode` (`E05` / `V12` / `P03` …) is carried on the exception
 * so the caller can surface the exact error. The contract is
 * `docs/design-vi/Denshiban-mapper/outbound-field-matrix.md` §E.
 */
export class DenshibanApiException extends Error {
  constructor(
    /** The status code denshiban returned (`E05` / `V12` / `P03` …). */
    readonly statusCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'DenshibanApiException';
  }
}
