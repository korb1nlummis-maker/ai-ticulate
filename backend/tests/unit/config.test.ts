import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns parsed config when all required env vars are set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'development';

    const cfg = loadConfig();

    expect(cfg.anthropicApiKey).toBe('sk-ant-test');
    expect(cfg.anthropicModel).toBe('claude-sonnet-4-6');
    expect(cfg.port).toBe(4000);
    expect(cfg.nodeEnv).toBe('development');
  });

  it('defaults PORT to 3000 and NODE_ENV to development', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    delete process.env.PORT;
    delete process.env.NODE_ENV;

    const cfg = loadConfig();

    expect(cfg.port).toBe(3000);
    expect(cfg.nodeEnv).toBe('development');
  });

  it('defaults ANTHROPIC_MODEL to the configured Haiku snapshot', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    delete process.env.ANTHROPIC_MODEL;
    const cfg = loadConfig();
    expect(cfg.anthropicModel).toBe('claude-haiku-4-5-20251001');
  });

  it('throws a clear error if ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => loadConfig()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws if PORT is non-numeric', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.PORT = 'not-a-number';
    expect(() => loadConfig()).toThrow(/PORT/);
  });

  it('throws if NODE_ENV is not one of the allowed values', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'staging';
    expect(() => loadConfig()).toThrow(/NODE_ENV/);
  });

  it('aggregates multiple invalid env vars into one error message', () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.PORT = 'not-a-number';
    expect(() => loadConfig()).toThrow(/ANTHROPIC_API_KEY.*PORT|PORT.*ANTHROPIC_API_KEY/);
  });
});
