import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "./config";
import { getRepo } from "@/lib/app/repo";

/**
 * authorize() resolves through the User repo (lib/app/repo/) — with no
 * DATABASE_URL that's the in-memory repo, seeded from the same
 * ADMIN_EMAIL / ADMIN_PASSWORD_HASH env vars used to seed the real DB, so
 * login behaves identically either way. Any failure path (missing fields,
 * no matching user, bad password, an unexpected error) returns null rather
 * than throwing — middleware and the sign-in form depend on that.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email =
            typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : null;
          const password = typeof credentials?.password === "string" ? credentials.password : null;
          if (!email || !password) return null;

          const repo = await getRepo();
          const user = await repo.getUserByEmail(email);
          if (!user) return null;

          const valid = await compare(password, user.passwordHash);
          if (!valid) return null;

          return { id: user.id, email: user.email, name: user.name, role: user.role };
        } catch (error) {
          console.error("[auth] authorize failed", error);
          return null;
        }
      },
    }),
  ],
});
