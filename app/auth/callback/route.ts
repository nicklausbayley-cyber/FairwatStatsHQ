import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/reset-password";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/forgot-password?error=missing-code", requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/forgot-password?error=invalid-link", requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
