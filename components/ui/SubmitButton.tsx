import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
}

export function SubmitButton({
  variant = "primary",
  fullWidth = false,
  className,
  children,
  type = "submit",
  ...rest
}: SubmitButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.fullWidth : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
