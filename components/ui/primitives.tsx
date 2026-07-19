import type { ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const appPanelClassName =
  "rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5";

export const inputClassName =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-md bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300";

export const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-green-200 hover:bg-green-50 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400";

export const dangerButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400";

export const tableShellClassName =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5";

export const tableHeaderClassName =
  "hidden gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";

export const tableRowClassName =
  "grid gap-3 px-5 py-4 text-sm transition hover:bg-green-50/40";

type BadgeTone = "green" | "slate" | "amber";

const badgeToneClassNames: Record<BadgeTone, string> = {
  green: "border-green-200 bg-green-50 text-green-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800"
};

export function Badge({
  children,
  tone = "green",
  className
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        badgeToneClassNames[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Message({
  type,
  children
}: {
  type: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={
        type === "success"
          ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-900"
          : "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
      }
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn(appPanelClassName, "p-6 text-sm leading-6 text-slate-600")}>
      {title ? <p className="font-semibold text-slate-950">{title}</p> : null}
      <p className={title ? "mt-1" : undefined}>{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn(appPanelClassName, "p-6 sm:p-8")}>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {description}
          </p>
        </div>
        {meta || action ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {meta}
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div
      className={cn(
        appPanelClassName,
        "relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-green-700" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function FormSection({
  eyebrow,
  title,
  description,
  children,
  footer,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(appPanelClassName, "p-6 sm:p-8", className)}>
      <div>
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-5 border-t border-slate-100 pt-5">{footer}</div> : null}
    </div>
  );
}
