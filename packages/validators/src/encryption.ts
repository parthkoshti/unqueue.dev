import { z } from "zod";

export const encryptedEnvelopeSchema = z.object({
  keyId: z.number().int(),
  iv: z.string(),
  tag: z.string(),
  ciphertext: z.string(),
});
