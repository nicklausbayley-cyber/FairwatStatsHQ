import { requireSupportAdmin } from "../../lib/auth/support-admin";
import { SupportConsole } from "./support-console";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  await requireSupportAdmin();
  return <section className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Fairway Stats HQ · Internal</p>
      <h1 className="mt-2 text-3xl font-bold">Support Center</h1>
      <p className="mt-2 text-slate-600">Search schools, review setup health, and manage team golf courses without signing in as a coach.</p>
    </div>
    <SupportConsole previewReadOnly={process.env.VERCEL_ENV !== "production"} />
  </section>;
}
