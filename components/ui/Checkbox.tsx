import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Checkbox.module.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const classes = [styles.wrap, className].filter(Boolean).join(" ");

  return (
    <label className={classes} htmlFor={id}>
      <input type="checkbox" id={id} className={styles.input} {...rest} />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
