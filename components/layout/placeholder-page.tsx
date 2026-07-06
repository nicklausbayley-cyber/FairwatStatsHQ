import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  actions?: Array<{
    href: string;
    label: string;
  }>;
};

export function PlaceholderPage({
  title,
  eyebrow,
  description,
  actions = []
}: PlaceholderPageProps) {
  return (
    <section className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
        {description}
      </p>

      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-900"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
