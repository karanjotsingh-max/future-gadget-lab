import Link from "next/link";

type GadgetStatus = "online" | "in-development" | "offline";

type Props = {
  id: string;
  name: string;
  description: string;
  href: string;
  status: GadgetStatus;
  /** Optional flavor text appended to the status row. */
  flavor?: string;
};

const STATUS_COLOR: Record<GadgetStatus, string> = {
  online: "text-(--color-terminal-green)",
  "in-development": "text-(--color-steiner-amber)",
  offline: "text-(--color-text-dim)",
};

const STATUS_LABEL: Record<GadgetStatus, string> = {
  online: "ONLINE",
  "in-development": "IN DEVELOPMENT",
  offline: "OFFLINE",
};

export default function GadgetCard({
  id,
  name,
  description,
  href,
  status,
  flavor,
}: Props) {
  const disabled = status !== "online";

  const inner = (
    <article
      className={`
        crt-frame group relative flex h-full flex-col gap-4 p-6
        transition duration-200
        ${disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:border-(--color-terminal-green)/60"}
      `}
    >
      <header className="flex items-baseline justify-between">
        <span
          className="text-[10px] tracking-[0.3em] text-(--color-text-muted)"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          GADGET / {id}
        </span>
        <span
          className={`text-[10px] tracking-[0.3em] ${STATUS_COLOR[status]}`}
          style={{ fontFamily: "var(--font-ui)" }}
        >
          {STATUS_LABEL[status]}
        </span>
      </header>

      <h2
        className="text-2xl leading-tight text-(--color-text-cold)"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {name}
      </h2>

      <p
        className="flex-1 text-sm leading-relaxed text-(--color-text-muted)"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {description}
      </p>

      <footer className="flex items-center justify-between pt-2 text-[11px] tracking-[0.2em]">
        {flavor ? (
          <span className="text-(--color-text-dim)">{flavor}</span>
        ) : (
          <span />
        )}
        <span
          className={
            disabled ? "text-(--color-text-dim)" : "phosphor-green"
          }
        >
          {disabled ? "// LOCKED" : `> ACCESS`}
        </span>
      </footer>
    </article>
  );

  if (disabled) {
    return <div aria-disabled className="cursor-not-allowed">{inner}</div>;
  }

  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-terminal-green)">
      {inner}
    </Link>
  );
}
