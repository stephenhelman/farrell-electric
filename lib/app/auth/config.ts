import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config — no Credentials provider here (bcrypt needs the
 * Node runtime), so this is what middleware's session check runs against
 * via next-auth/jwt's getToken(). The full config with the Credentials
 * provider lives in ./index.ts and only runs in the Node API route.
 */
export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.role) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
