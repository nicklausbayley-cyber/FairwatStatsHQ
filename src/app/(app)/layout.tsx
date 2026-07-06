import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUserContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect("/login");
  }

  return <AppShell context={context}>{children}</AppShell>;
}
