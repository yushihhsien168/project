import { getUser, admin } from "@netlify/identity";

const ADMIN_EMAIL = "felix670131@gmail.com";
const APPROVED_ROLE = "member_approved";
const PENDING_ROLE = "member_pending";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function isAdmin(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}

function publicUser(user) {
  const roles = user?.appMetadata?.roles || user?.roles || [];
  return {
    id: user.id,
    email: user.email || "",
    name: user.userMetadata?.full_name || user.userMetadata?.name || user.name || "",
    provider: user.provider || "",
    createdAt: user.createdAt || "",
    lastSignInAt: user.lastSignInAt || "",
    approved: roles.includes(APPROVED_ROLE),
    pending: roles.includes(PENDING_ROLE)
  };
}

export default async (req) => {
  const operator = await getUser();
  if (!isAdmin(operator)) return json({ error: "Forbidden" }, 403);

  try {
    if (req.method === "GET") {
      const users = await admin.listUsers({ perPage: 1000 });
      return json({ users: users.map(publicUser) });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const target = await admin.getUser(body.userId);
      if (!target) return json({ error: "User not found" }, 404);

      const currentRoles = Array.isArray(target.appMetadata?.roles)
        ? [...target.appMetadata.roles]
        : [];

      const roles = currentRoles.filter(
        (role) => role !== APPROVED_ROLE && role !== PENDING_ROLE
      );

      if (body.action === "approve") {
        roles.push(APPROVED_ROLE);
      } else if (body.action === "revoke") {
        roles.push(PENDING_ROLE);
      } else if (body.action !== "setName") {
        return json({ error: "Invalid action" }, 400);
      }

      const updatePayload = {
        app_metadata: {
          ...(target.appMetadata || {}),
          roles
        }
      };

      if (body.action === "setName") {
        const name = String(body.name || "").trim();
        if (!name) return json({ error: "Chinese name is required" }, 400);
        updatePayload.user_metadata = {
          ...(target.userMetadata || {}),
          full_name: name
        };
      }

      const updated = await admin.updateUser(target.id, updatePayload);

      return json({ user: publicUser(updated) });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("member-admin error", error);
    return json({ error: error?.message || "Internal error" }, 500);
  }
};
