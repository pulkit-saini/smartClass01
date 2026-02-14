import clsx from "clsx";
import type { PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const Card = ({ title, subtitle, compact = false, children }: CardProps) => {
  return (
    <section className={clsx("card", compact && "card-compact")}>
      {(title || subtitle) && (
        <header className="card-header">
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      )}
      <div className="card-content">{children}</div>
    </section>
  );
};
