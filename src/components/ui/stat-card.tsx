import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "green"
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "green" | "gold" | "blue" | "dark";
}) {
  const tones = {
    green: "bg-fairway-50 text-fairway-700",
    gold: "bg-[#fff4d8] text-[#936915]",
    blue: "bg-skyline-100 text-skyline-500",
    dark: "bg-graphite-100 text-graphite-700"
  };

  return (
    <div className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-graphite-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-normal text-graphite-900">
            {value}
          </p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-graphite-600">{detail}</p>
    </div>
  );
}
