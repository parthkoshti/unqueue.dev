import { createId as cuid2CreateId, init } from "@paralleldrive/cuid2";

const createCuid = init({ length: 24 });

export function createId(): string {
  return createCuid();
}
