import {
  decrypt,
  encrypt,
  parseEncryptionKeysFromEnv,
  reEncrypt,
  type EncryptionKey,
} from "@unstall/shared/encryption";
import type { EncryptedEnvelope } from "@unstall/shared";
import { env } from "./env.js";

let keys: EncryptionKey[] | null = null;

export function getEncryptionKeys(): EncryptionKey[] {
  if (!keys) {
    keys = parseEncryptionKeysFromEnv(env.ENCRYPTION_KEYS);
  }
  return keys;
}

export function encryptSecret(plaintext: string): EncryptedEnvelope {
  return encrypt(plaintext, getEncryptionKeys());
}

export function decryptSecret(envelope: EncryptedEnvelope): string {
  return decrypt(envelope, getEncryptionKeys());
}

export function rotateEnvelope(envelope: EncryptedEnvelope): EncryptedEnvelope {
  return reEncrypt(envelope, getEncryptionKeys());
}
