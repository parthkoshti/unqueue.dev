import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
export function parseEncryptionKeysFromEnv(json) {
    const parsed = JSON.parse(json);
    return parsed.map((entry) => ({
        keyId: entry.keyId,
        key: Buffer.from(entry.key, "base64"),
    }));
}
export function getActiveKey(keys) {
    const sorted = [...keys].sort((a, b) => b.keyId - a.keyId);
    const active = sorted[0];
    if (!active) {
        throw new Error("No encryption keys configured");
    }
    return active;
}
export function encrypt(plaintext, keys) {
    const activeKey = getActiveKey(keys);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, activeKey.key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
        keyId: activeKey.keyId,
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        ciphertext: encrypted.toString("base64"),
    };
}
export function decrypt(envelope, keys) {
    const key = keys.find((k) => k.keyId === envelope.keyId);
    if (!key) {
        throw new Error(`Encryption key ${envelope.keyId} not found`);
    }
    const decipher = createDecipheriv(ALGORITHM, key.key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
export function reEncrypt(envelope, keys) {
    const plaintext = decrypt(envelope, keys);
    return encrypt(plaintext, keys);
}
//# sourceMappingURL=encryption.js.map