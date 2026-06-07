import type { Env } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Cache for derived encryption keys (module-level, persists within Worker instance)
const keyCache = new Map<string, CryptoKey>();

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode(...chunk));
  }
  
  return btoa(chunks.join(''));
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function keyFromSecret(secret: string): Promise<CryptoKey> {
  // Use a hash of the secret as cache key to avoid storing plaintext
  const cacheKey = secret.substring(0, 16);
  
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }
  
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
  
  keyCache.set(cacheKey, key);
  return key;
}

export async function encryptApiKey(apiKey: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromSecret(env.API_KEY_ENCRYPTION_SECRET);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(apiKey));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptApiKey(encrypted: string, env: Env): Promise<string> {
  const [ivValue, ciphertextValue] = encrypted.split(".");
  if (!ivValue || !ciphertextValue) {
    throw new Error("Invalid encrypted API key format");
  }

  const key = await keyFromSecret(env.API_KEY_ENCRYPTION_SECRET);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivValue) as BufferSource },
    key,
    base64ToBytes(ciphertextValue) as BufferSource
  );
  return decoder.decode(plaintext);
}
