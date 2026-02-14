import clsx from "clsx";

interface StatusPillProps {
  text: string;
  color: "GREEN" | "YELLOW" | "RED";
  className?: string;
}

export const StatusPill = ({ text, color, className }: StatusPillProps) => {
  return <span className={clsx("status-pill", `status-${color.toLowerCase()}`, className)}>{text}</span>;
};
