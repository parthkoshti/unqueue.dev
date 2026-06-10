import type { Role } from "@unqueue/shared";

export type Actor = {
  userId: string;
  email?: string;
  name?: string;
  membership?: {
    workspaceId: string;
    role: Role;
  };
};
