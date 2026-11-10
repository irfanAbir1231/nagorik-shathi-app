import { describe, it, expect } from 'vitest';
import { isMobileClient, mobileTokens, parseBearer } from '@/lib/http/mobile';

const req = (headers: Record<string, string> = {}) => new Request('http://x.test/', { headers });
const tokens = { accessToken: 'a.b.c', refreshToken: 'r.s' };

describe('native client auth helpers', () => {
  it('recognises only X-Client: mobile', () => {
    expect(isMobileClient(req({ 'X-Client': 'mobile' }))).toBe(true);
    expect(isMobileClient(req({ 'X-Client': 'Mobile' }))).toBe(true);
    expect(isMobileClient(req({ 'X-Client': 'web' }))).toBe(false);
    expect(isMobileClient(req())).toBe(false);
  });

  it('never exposes tokens in the body to browsers', () => {
    expect(mobileTokens(req(), tokens)).toEqual({});
  });

  it('returns the token pair and lifetime to mobile', () => {
    const body = mobileTokens(req({ 'X-Client': 'mobile' }), tokens);
    expect(body.accessToken).toBe('a.b.c');
    expect(body.refreshToken).toBe('r.s');
    expect(body.expiresIn).toBeGreaterThan(0);
  });

  it('parses bearer headers strictly', () => {
    expect(parseBearer('Bearer abc')).toBe('abc');
    expect(parseBearer('bearer abc')).toBe('abc');
    expect(parseBearer('Basic abc')).toBeNull();
    expect(parseBearer('Bearer')).toBeNull();
    expect(parseBearer('Bearer a b')).toBeNull();
    expect(parseBearer(null)).toBeNull();
  });
});
