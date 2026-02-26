export function normalizeAuthToken(raw: string): string {
  let token = String(raw ?? '').trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  token = token.replace(/^bearer\s+/i, '').trim();

  // jwt should never contain whitespace; strip any accidental newlines/spaces
  if (token.includes('.')) {
    token = token.replace(/\s+/g, '');
  } else {
    token = token.replace(/[\r\n\t]/g, '').trim();
  }

  return token;
}

export function toAuthorizationHeaderValue(raw: string): string {
  const token = normalizeAuthToken(raw);
  return token ? `Bearer ${token}` : '';
}
