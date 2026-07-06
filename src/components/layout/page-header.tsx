import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase text-fairway-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-graphite-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite-600">
            {description}
          </p>
        ) : null}
      </div>
      {Icon ? (
        <div className="flex size-12 items-center justify-center rounded-lg bg-fairway-700 text-white">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
