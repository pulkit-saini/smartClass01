interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  hint?: string;
}

export const SectionHeader = ({ eyebrow, title, hint }: SectionHeaderProps) => {
  return (
    <div className="section-header">
      {eyebrow ? <p className="overline">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {hint ? <p className="section-hint">{hint}</p> : null}
    </div>
  );
};
