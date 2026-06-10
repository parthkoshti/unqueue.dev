import { init } from "@paralleldrive/cuid2";
const createCuid = init({ length: 24 });
export function createId() {
    return createCuid();
}
//# sourceMappingURL=id.js.map