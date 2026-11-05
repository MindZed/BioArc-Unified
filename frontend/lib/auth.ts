// lib/auth.ts
// this file handles the authentication of the user

import NextAuth, { DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      id: string;
    } & DefaultSession["user"]
  }
  interface User {
    role: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;

        const email = (credentials.email as string) || "admin@bioarc.com";
        const password = credentials.password as string;
        const envAdminPassword = process.env.ADMIN_PASSWORD || "bioarc-admin";

        // 1. Direct environment master password check for Admin
        if (password === envAdminPassword) {
          return {
            id: "admin-master",
            email: "admin@bioarc.com",
            name: "BioArc Administrator",
            role: "ADMIN",
          };
        }

        // 2. Database user check (with error resilience)
        try {
          const user = await prisma.user.findUnique({
            where: { email }
          });

          if (user && user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              };
            }
          }
        } catch (dbErr) {
          console.error("[Auth] Database credential check failed:", dbErr);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "YOUR_NEXTAUTH_SECRET_PLACEHOLDER",
});
