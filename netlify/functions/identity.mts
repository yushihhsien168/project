import type { UserLoginEvent, UserSignupEvent } from "@netlify/functions";

const ADMIN_EMAIL = "felix670131@gmail.com";
const APPROVED_ROLE = "member_approved";
const PENDING_ROLE = "member_pending";

function rolesOf(user) {
  return Array.isArray(user?.appMetadata?.roles) ? user.appMetadata.roles : [];
}

function withRole(user, roleToAdd, removeRole) {
  const roles = rolesOf(user).filter((role) => role !== removeRole);
  if (!roles.includes(roleToAdd)) roles.push(roleToAdd);
  return {
    user: {
      ...user,
      appMetadata: {
        ...(user.appMetadata || {}),
        roles
      }
    }
  };
}

/**
 * Every Google/external signup starts as pending.
 * The account is not allowed to log in until the administrator approves it.
 */
export default {
  userSignup(event: UserSignupEvent) {
    if (event.user.email?.toLowerCase() === ADMIN_EMAIL) {
      return withRole(event.user, "admin", PENDING_ROLE);
    }
    return withRole(event.user, PENDING_ROLE, APPROVED_ROLE);
  },

  userLogin(event: UserLoginEvent) {
    const email = event.user.email?.toLowerCase();
    if (email === ADMIN_EMAIL) return;

    if (!rolesOf(event.user).includes(APPROVED_ROLE)) {
      return event.deny();
    }
  }
};
