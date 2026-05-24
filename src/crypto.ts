import type { Env } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
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
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
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
