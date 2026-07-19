"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";
import {
  FormSection,
  Message,
  inputClassName,
  primaryButtonClassName
} from "../../components/ui/primitives";

type FormMessage = {
  type: "error" | "success";
  text: string;
};

function getSignedInRedirectPath(role: string | null | undefined) {
  return role === "player" ? "/enter-score" : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "Email and password are required." });
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      let profileRole: string | null = null;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        profileRole = profile?.role ?? null;
      }

      const nextPath = getSignedInRedirectPath(profileRole);

      setMessage({
        type: "success",
        text:
          nextPath === "/enter-score"
            ? "Signed in. Opening score entry..."
            : "Signed in. Opening dashboard..."
      });
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not sign in. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-0"
    >
      <FormSection
        eyebrow="Account Access"
        title="Login"
        description="Sign in with the email and password connected to your team profile."
        footer={
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={primaryButtonClassName}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {message ? <Message type={message.type}>{message.text}</Message> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className={inputClassName}
              />
            </label>
          </div>
        </div>
      </FormSection>
    </form>
  );
}
