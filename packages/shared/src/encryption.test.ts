import { describe, expect, it } from "vitest";
import { decrypt, encrypt, getActiveKey, parseEncryptionKeysFromEnv, reEncrypt } from "./encryption.js";

const key1 = Buffer.alloc(32, 1).toString("base64");
const key2 = Buffer.alloc(32, 2).toString("base64");

const keysJson = JSON.stringify([
  { keyId: 1, key: key1 },
  { keyId: 2, key: key2 },
]);

describe("encryption", () => {
  const keys = parseEncryptionKeysFromEnv(keysJson);

  it("encrypts and decrypts", () => {
    const envelope = encrypt("secret-password", keys);
    expect(decrypt(envelope, keys)).toBe("secret-password");
    expect(envelope.keyId).toBe(2);
  });

  it("decrypts with older key after rotation", () => {
    const envelope = encrypt("old-secret", [keys[0]!]);
    expect(decrypt(envelope, keys)).toBe("old-secret");
  });

  it("re-encrypts to active key", () => {
    const envelope = encrypt("rotate-me", [keys[0]!]);
    const rotated = reEncrypt(envelope, keys);
    expect(rotated.keyId).toBe(getActiveKey(keys).keyId);
    expect(decrypt(rotated, keys)).toBe("rotate-me");
  });
});
