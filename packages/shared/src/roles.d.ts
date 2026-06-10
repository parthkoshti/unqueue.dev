export declare const ROLES: readonly ["owner", "admin", "member", "viewer"];
export type Role = (typeof ROLES)[number];
export declare const ROLE_HIERARCHY: Record<Role, number>;
export declare function hasMinimumRole(userRole: Role, required: Role): boolean;
//# sourceMappingURL=roles.d.ts.map