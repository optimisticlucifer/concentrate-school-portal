declare module 'jsonwebtoken' {
  interface SignOptions {
    expiresIn?: string | number;
  }
  export function sign(
    payload: Record<string, unknown>,
    secret: string,
    options?: SignOptions
  ): string;
  export function verify(token: string, secret: string): unknown;
  const jwt: { sign: typeof sign; verify: typeof verify };
  export default jwt;
}
