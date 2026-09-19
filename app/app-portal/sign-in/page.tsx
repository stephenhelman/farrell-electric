import { SignInForm } from "./SignInForm";
import styles from "./sign-in.module.css";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Sign in</h1>
      <SignInForm callbackUrl={params.callbackUrl ?? "/"} />
    </div>
  );
}
