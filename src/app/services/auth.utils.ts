export function generateCodeVerifier(length = 64): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return randomValues.reduce(
    (acc, x) => acc + possible[x % possible.length],
    '',
  );
}

export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
