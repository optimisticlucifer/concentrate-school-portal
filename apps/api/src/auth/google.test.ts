import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../config.js';
import { exchangeGoogleCode, googleAuthUrl } from './google.js';

const jsonOk = (body: unknown) => ({ ok: true, json: async () => body });
const notOk = () => ({ ok: false, json: async () => ({}) });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('googleAuthUrl', () => {
  it('builds an auth url with client_id, redirect_uri, state, and scope', () => {
    const url = new URL(googleAuthUrl('xyz-state'));
    const p = url.searchParams;
    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(p.get('client_id')).toBe(config.google.clientId);
    expect(p.get('redirect_uri')).toBe(
      `${config.appUrl}/api/auth/google/callback`
    );
    expect(p.get('state')).toBe('xyz-state');
    expect(p.get('scope')).toBe('openid email profile');
    expect(p.get('response_type')).toBe('code');
  });
});

describe('exchangeGoogleCode', () => {
  it('returns the profile from token + userinfo responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ access_token: 'tok-123' }))
      .mockResolvedValueOnce(
        jsonOk({ sub: 'sub-1', email: 'x@test.local', name: 'Ada' })
      );
    vi.stubGlobal('fetch', fetchMock);

    const profile = await exchangeGoogleCode('the-code');
    expect(profile).toEqual({
      subject: 'sub-1',
      email: 'x@test.local',
      name: 'Ada',
    });

    // token exchange first, userinfo second with bearer token
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
    const infoCall = fetchMock.mock.calls[1];
    expect(infoCall[0]).toBe('https://openidconnect.googleapis.com/v1/userinfo');
    expect(infoCall[1].headers.authorization).toBe('Bearer tok-123');
  });

  it('falls back to email as name when userinfo omits name', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ access_token: 'tok' }))
      .mockResolvedValueOnce(jsonOk({ sub: 's', email: 'noname@test.local' }));
    vi.stubGlobal('fetch', fetchMock);

    const profile = await exchangeGoogleCode('c');
    expect(profile.name).toBe('noname@test.local');
  });

  it('throws when the token endpoint is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(notOk()));
    await expect(exchangeGoogleCode('bad')).rejects.toThrow(
      'google token exchange failed'
    );
  });

  it('throws when the userinfo endpoint is not ok', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ access_token: 'tok' }))
      .mockResolvedValueOnce(notOk());
    vi.stubGlobal('fetch', fetchMock);
    await expect(exchangeGoogleCode('c')).rejects.toThrow(
      'google userinfo failed'
    );
  });
});
