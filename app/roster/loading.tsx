import { appPanelClassName, cn, tableShellClassName } from "../../components/ui/primitives";

export default function RosterLoading() {
  return (
    <section className="space-y-6">
      <div className={cn(appPanelClassName, "p-6 sm:p-8")}>
        <div className="h-4 w-24 rounded bg-green-100" />
        <div className="mt-4 h-10 w-48 rounded bg-slate-100" />
        <div className="mt-4 h-5 max-w-xl rounded bg-slate-100" />
      </div>

      <div className={tableShellClassName}>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-4"
          >
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-slate-100" />
            <div className="h-5 rounded bg-green-50" />
          </div>
        ))}
      </div>
    </section>
  );
}
