import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

type PlatformAdminStatus =
  | {
      data: {
        supabase: Awaited<ReturnType<typeof createClient>>;
        user: User;
        email: string;
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

export function getPlatformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getPlatformAdminEmails().includes(normalizeEmail(email));
}

export async function getPlatformAdminStatus(): Promise<PlatformAdminStatus> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      return {
        data: null,
        error: error.message,
        status: "unauthenticated"
      };
    }

    if (!user?.email) {
      return {
        data: null,
        error: "Please sign in with a platform admin account.",
        status: "unauthenticated"
      };
    }

    if (!isPlatformAdminEmail(user.email)) {
      return {
        data: null,
        error: "This account is not allowed to access onboarding.",
        status: "forbidden"
      };
    }

    return {
      data: {
        supabase,
        user,
        email: normalizeEmail(user.email)
      },
      error: null,
      status: "ready"
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not verify platform admin access.",
      status: "error"
    };
  }
}

export function platformAdminStatusCode(status: PlatformAdminStatus["status"]) {
  return status === "unauthenticated" ? 401 : 403;
}

export async function requirePlatformAdmin() {
  const status = await getPlatformAdminStatus();

  if (!status.data) {
    if (status.status === "unauthenticated") {
      redirect("/login");
    }

    redirect("/enter-score");
  }

  return status.data;
}
