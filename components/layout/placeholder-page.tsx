import Link from "next/link";
import { PageHeader, primaryButtonClassName } from "../ui/primitives";

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
    <section>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          actions.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={primaryButtonClassName}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null
        }
      />
    </section>
  );
}
