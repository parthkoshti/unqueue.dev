import {
  decrypt,
  encrypt,
  parseEncryptionKeysFromEnv,
  reEncrypt,
  type EncryptionKey,
} from "@unqueue/shared/encryption";
import type { EncryptedEnvelope } from "@unqueue/shared";

export type EncryptionService = {
  encrypt(plaintext: string): EncryptedEnvelope;
  decrypt(envelope: EncryptedEnvelope): string;
  rotate(envelope: EncryptedEnvelope): EncryptedEnvelope;
};

export function createEncryptionService(
  encryptionKeys: string,
): EncryptionService {
  let keys: EncryptionKey[] | null = null;

  function getKeys(): EncryptionKey[] {
    if (!keys) {
      keys = parseEncryptionKeysFromEnv(encryptionKeys);
    }
    return keys;
  }

  return {
    encrypt(plaintext: string) {
      return encrypt(plaintext, getKeys());
    },
    decrypt(envelope: EncryptedEnvelope) {
      return decrypt(envelope, getKeys());
    },
    rotate(envelope: EncryptedEnvelope) {
      return reEncrypt(envelope, getKeys());
    },
  };
}
