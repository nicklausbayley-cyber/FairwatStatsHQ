import { appPanelClassName, cn, tableShellClassName } from "../../components/ui/primitives";

export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div className={cn(appPanelClassName, "p-6 sm:p-8")}>
        <div className="h-4 w-32 rounded bg-green-100" />
        <div className="mt-4 h-10 w-56 rounded bg-slate-100" />
        <div className="mt-4 h-5 max-w-xl rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
          <div
            key={item}
            className={cn(appPanelClassName, "p-5")}
          >
            <div className="h-4 w-28 rounded bg-slate-100" />
            <div className="mt-4 h-8 w-20 rounded bg-green-50" />
            <div className="mt-4 h-4 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className={tableShellClassName}>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 lg:grid-cols-9"
          >
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-green-50" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
