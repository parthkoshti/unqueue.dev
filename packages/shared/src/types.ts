export type EncryptedEnvelope = {
  keyId: number;
  iv: string;
  tag: string;
  ciphertext: string;
};
