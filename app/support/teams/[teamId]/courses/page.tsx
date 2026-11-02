import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSupportAdmin } from "../../../../../lib/auth/support-admin";
import { isUuid } from "../../../../../lib/support/course-input";
import { SupportCourseEditor } from "./support-course-editor";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function SupportTeamCoursesPage({ params }: PageProps) {
  await requireSupportAdmin();
  const { teamId } = await params;
  if (!isUuid(teamId)) notFound();

  const previewReadOnly = process.env.VERCEL_ENV !== "production";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/support" className="font-semibold text-emerald-800 hover:underline">Support Center</Link>
        <span className="text-slate-400">/</span>
        <Link href={"/support/teams/" + teamId} className="font-semibold text-emerald-800 hover:underline">Team Dashboard</Link>
        <span className="text-slate-400">/</span>
        <span className="font-semibold text-slate-700">Courses</span>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Internal support · Course setup</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Manage Team Courses</h1>
        <p className="mt-2 text-sm text-slate-600">
          Inspect course details, configure 9- or 18-hole layouts, and maintain par, handicap, and yardage.
        </p>
      </div>
      {previewReadOnly ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Preview mode — no changes are saved.</strong> You can inspect live course setup and validate edits locally.
          Authorized course saves will be enabled only in the production Support Center after release.
        </div>
      ) : null}
      <SupportCourseEditor teamId={teamId} previewReadOnly={previewReadOnly} />
    </section>
  );
}
