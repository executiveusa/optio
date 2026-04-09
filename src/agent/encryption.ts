/**
 * Metamorfosis — Client-Side Encryption
 * ────────────────────────────────────────
 * E2E encryption for all user data.
 * Uses Web Crypto API (AES-256-GCM + PBKDF2).
 * Data never leaves the device unencrypted.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 600_000;

/**
 * Derive an AES-256-GCM key from a user password/passphrase
 */
export async function deriveKey(
  passphrase: string,
  salt?: Uint8Array,
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const generatedSalt = salt ?? crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: generatedSalt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );

  return { key, salt: generatedSalt };
}

/**
 * Encrypt plaintext string → base64 encoded ciphertext
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(plaintext),
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt base64 ciphertext → plaintext string
 */
export async function decrypt(
  ciphertext: string,
  key: CryptoKey,
): Promise<string> {
  const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = raw.slice(0, IV_LENGTH);
  const data = raw.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypt an object (serializes to JSON first)
 */
export async function encryptObject(
  obj: unknown,
  key: CryptoKey,
): Promise<string> {
  return encrypt(JSON.stringify(obj), key);
}

/**
 * Decrypt back to an object
 */
export async function decryptObject<T = unknown>(
  ciphertext: string,
  key: CryptoKey,
): Promise<T> {
  const json = await decrypt(ciphertext, key);
  return JSON.parse(json) as T;
}

/**
 * Store encrypted data in localStorage
 */
export async function secureStore(
  storageKey: string,
  data: unknown,
  encryptionKey: CryptoKey,
): Promise<void> {
  const encrypted = await encryptObject(data, encryptionKey);
  localStorage.setItem(`metamorfosis_${storageKey}`, encrypted);
}

/**
 * Retrieve and decrypt data from localStorage
 */
export async function secureRetrieve<T = unknown>(
  storageKey: string,
  encryptionKey: CryptoKey,
): Promise<T | null> {
  const encrypted = localStorage.getItem(`metamorfosis_${storageKey}`);
  if (!encrypted) return null;
  return decryptObject<T>(encrypted, encryptionKey);
}

/**
 * Securely store an API key (BYOK)
 */
export async function storeApiKey(
  provider: string,
  apiKey: string,
  encryptionKey: CryptoKey,
): Promise<void> {
  await secureStore(`byok_${provider}`, { key: apiKey, storedAt: Date.now() }, encryptionKey);
}

/**
 * Retrieve a stored API key
 */
export async function getApiKey(
  provider: string,
  encryptionKey: CryptoKey,
): Promise<string | null> {
  const result = await secureRetrieve<{ key: string }>(
    `byok_${provider}`,
    encryptionKey,
  );
  return result?.key ?? null;
}
