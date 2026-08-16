// assertProductionSecrets() — regression: this used to throw a raw Error
// instead of the project's ConfigValidationException. It's a boot-time
// fail-fast (runs inside the ConfigModule factory, before the DI container
// exists), so it can't use DomainException (no HTTP context) — hence its
// own dedicated exception class rather than reusing an HTTP-flavored one.

import { ConfigValidationException } from '@/common/exceptions/config-validation.exception';
import configuration from './configuration';

const REQUIRED_PROD_ENV = {
  NODE_ENV: 'production',
  SESSION_SECRET: 'a'.repeat(32),
  DB_PASSWORD: 'a-real-prod-password',
  STORAGE_ACCESS_KEY: 'a-real-access-key',
  STORAGE_SECRET_KEY: 'a-real-secret-key',
};

describe('configuration() — assertProductionSecrets', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should not throw outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(() => configuration()).not.toThrow();
  });

  it('should not throw in production when every secret is set to a real value', () => {
    process.env = { ...process.env, ...REQUIRED_PROD_ENV };
    expect(() => configuration()).not.toThrow();
  });

  it('should throw ConfigValidationException (not a raw Error) when a secret is unset in production', () => {
    process.env = { ...process.env, ...REQUIRED_PROD_ENV };
    delete process.env.SESSION_SECRET;
    expect(() => configuration()).toThrow(ConfigValidationException);
  });

  it('should list the offending key(s) and reason in the error message', () => {
    process.env = { ...process.env, ...REQUIRED_PROD_ENV };
    process.env.DB_PASSWORD = 'postgres'; // still at dev default
    delete process.env.STORAGE_ACCESS_KEY; // unset

    let caught: unknown;
    try {
      configuration();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ConfigValidationException);
    expect((caught as Error).message).toContain('DB_PASSWORD (still at dev default)');
    expect((caught as Error).message).toContain('STORAGE_ACCESS_KEY (unset)');
  });

  it('should throw when SESSION_SECRET is set but shorter than 32 bytes', () => {
    process.env = { ...process.env, ...REQUIRED_PROD_ENV };
    process.env.SESSION_SECRET = 'too-short';

    let caught: unknown;
    try {
      configuration();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ConfigValidationException);
    expect((caught as Error).message).toContain('SESSION_SECRET (length < 32 bytes)');
  });
});
