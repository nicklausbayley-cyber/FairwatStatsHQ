"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

type SessionStatus = "checking" | "valid" | "invalid";

export default function AccountSetupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function establishInviteSession() {
      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          if (isMounted) {
            setSessionStatus("invalid");
          }
          return;
        }
      }

      const hashParameters = new URLSearchParams(
        currentUrl.hash.replace(/^#/, "")
      );
      const accessToken = hashParameters.get("access_token");
      const refreshToken = hashParameters.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          if (isMounted) {
            setSessionStatus("invalid");
          }
          return;
        }
      }

      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !user) {
        setSessionStatus("invalid");
        return;
      }

      window.history.replaceState(
        {},
        document.title,
        "/account-setup"
      );
      setSessionStatus("valid");
    }

    void establishInviteSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted && session?.user) {
        setSessionStatus("valid");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Your password must be at least 8 characters."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "The passwords do not match."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setMessage({
          type: "error",
          text:
            "Your account could not be completed. The invitation may have expired."
        });
        return;
      }

      await supabase.auth.signOut();

      setWasCompleted(true);
      setNewPassword("");
      setConfirmPassword("");
      setMessage({
        type: "success",
        text:
          "Your account is ready. You can now sign in to Fairway Stats HQ."
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "Your account could not be completed. Please request a new invitation."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/fairway-stats-hq-logo.png"
            alt="Fairway Stats HQ logo"
            className="mx-auto h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-xl"
          />

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
            Fairway Stats HQ
          </p>

          <h1 className="mt-3 text-3xl font-black text-white">
            Finish setting up your account
          </h1>

          <p className="mt-3 text-sm text-slate-300">
            Create the password you will use to access your team.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          {sessionStatus === "checking" ? (
            <p className="text-center text-sm text-slate-600">
              Verifying your invitation...
            </p>
          ) : sessionStatus === "invalid" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                This invitation is invalid or has expired. Contact your coach
                or Fairway Stats HQ administrator for a new invitation.
              </div>

              <Link
                href="/login"
                className="block rounded-2xl bg-emerald-700 px-5 py-3.5 text-center text-sm font-bold text-white hover:bg-emerald-800"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    message.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              {!wasCompleted ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-800">
                      Create password
                    </span>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-800">
                      Confirm password
                    </span>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSubmitting
                      ? "Creating Account..."
                      : "Complete Account Setup"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Continue to Sign In
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
