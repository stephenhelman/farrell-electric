"use client";

import { signOut } from "next-auth/react";
import styles from "./SignOutButton.module.css";

export function SignOutButton() {
  return (
    <button type="button" className={styles.button} onClick={() => signOut({ redirectTo: "/sign-in" })}>
      Sign out
    </button>
  );
}
