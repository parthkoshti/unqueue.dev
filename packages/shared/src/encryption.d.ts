import type { EncryptedEnvelope } from "./types.js";
export type EncryptionKey = {
    keyId: number;
    key: Buffer;
};
export declare function parseEncryptionKeysFromEnv(json: string): EncryptionKey[];
export declare function getActiveKey(keys: EncryptionKey[]): EncryptionKey;
export declare function encrypt(plaintext: string, keys: EncryptionKey[]): EncryptedEnvelope;
export declare function decrypt(envelope: EncryptedEnvelope, keys: EncryptionKey[]): string;
export declare function reEncrypt(envelope: EncryptedEnvelope, keys: EncryptionKey[]): EncryptedEnvelope;
//# sourceMappingURL=encryption.d.ts.map