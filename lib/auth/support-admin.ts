import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isPlatformAdminEmail } from "./platform-admin";
import { createClient } from "../supabase/server";

type SupportAdminStatus =
  | {
      data: {
        user: User;
        email: string;
        isPlatformOwner: boolean;
      };
      error: null;
      status: "ready";
    }
  | {
      data: null;
      error: string;
      status: "unauthenticated" | "forbidden" | "error";
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function supportAdminEmails() {
  return (process.env.SUPPORT_ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

/**
 * Internal access is independent of the team-scoped public.profiles.role enum.
 * Authorization is checked on the server for EVERY support page and API action.
 * Never use user_metadata or a client-provided team role to grant support access.
 */
export async function getSupportAdminStatus(): Promise<SupportAdminStatus> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user?.email) {
      return {
        data: null,
        error: "Please sign in to access support.",
        status: "unauthenticated"
      };
    }

    const email = normalizeEmail(user.email);
    const isPlatformOwner = isPlatformAdminEmail(email);
    const isSupportAdmin = supportAdminEmails().includes(email);

    if (!user.email_confirmed_at || (!isPlatformOwner && !isSupportAdmin)) {
      return {
        data: null,
        error: "This account is not authorized for platform support.",
        status: "forbidden"
      };
    }

    return {
      data: { user, email, isPlatformOwner },
      error: null,
      status: "ready"
    };
  } catch {
    return {
      data: null,
      error: "Unable to verify support access.",
      status: "error"
    };
  }
}

export function supportAdminStatusCode(status: SupportAdminStatus["status"]) {
  return status === "unauthenticated" ? 401 : 403;
}

export async function requireSupportAdmin() {
  const status = await getSupportAdminStatus();

  if (!status.data) {
    redirect("/login");
  }

  return status.data;
}
