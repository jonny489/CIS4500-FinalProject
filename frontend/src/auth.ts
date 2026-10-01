import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { backendFetch } from "@/lib/backend";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        let res: Response;
        try {
          res = await backendFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
        } catch (e) {
          // Backend down or secret missing: log it, then fail the sign-in normally.
          console.error("Credentials login: backend request failed", e);
          return null;
        }

        if (!res.ok) return null;

        const user = await res.json();
        return {
          id: user.user_id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const res = await backendFetch("/auth/oauth", {
            method: "POST",
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              auth_provider: account.provider,
            }),
          });
          if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
          const data = await res.json();
          user.id = data.user_id;
        } catch (e) {
          // Deny the sign-in rather than continue with the provider's own id,
          // which isn't a row in our users table and would break saving.
          console.error("OAuth sign-in: could not register user with backend", e);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
