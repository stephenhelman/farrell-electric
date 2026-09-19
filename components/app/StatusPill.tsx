import styles from "./StatusPill.module.css";

const TONE_BY_STATUS: Record<string, "neutral" | "gold" | "green" | "red"> = {
  DRAFT: "neutral",
  SENT: "gold",
  ACCEPTED: "green",
  DECLINED: "red",
  UNSCHEDULED: "neutral",
  SCHEDULED: "gold",
  DONE: "green",
};

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function StatusPill({ status }: { status: string }) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  return <span className={`${styles.pill} ${styles[tone]}`}>{titleCase(status)}</span>;
}
