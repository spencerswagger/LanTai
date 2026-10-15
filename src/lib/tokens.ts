const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function newTrackingToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % 64];
  }
  return out;
}

export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token);
}
