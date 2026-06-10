import type { Role } from "@unstall/shared";

export type Actor = {
  userId: string;
  email?: string;
  name?: string;
  membership?: {
    workspaceId: string;
    role: Role;
  };
};
