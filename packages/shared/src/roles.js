export const ROLES = ["owner", "admin", "member", "viewer"];
export const ROLE_HIERARCHY = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
};
export function hasMinimumRole(userRole, required) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}
//# sourceMappingURL=roles.js.map