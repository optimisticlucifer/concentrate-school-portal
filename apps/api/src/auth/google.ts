import { z } from 'zod';
import { config } from '../config.js';

const redirectUri = (): string => `${config.appUrl}/api/auth/google/callback`;

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

const tokenResponse = z.object({ access_token: z.string() });
const userInfo = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

export interface GoogleProfile {
  subject: string;
  email: string;
  name: string;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('google token exchange failed');
  const { access_token } = tokenResponse.parse(await tokenRes.json());

  const infoRes = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    { headers: { authorization: `Bearer ${access_token}` } }
  );
  if (!infoRes.ok) throw new Error('google userinfo failed');
  const info = userInfo.parse(await infoRes.json());

  return {
    subject: info.sub,
    email: info.email,
    name: info.name ?? info.email,
  };
}
