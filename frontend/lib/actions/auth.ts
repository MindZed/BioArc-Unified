"use server";

import { signOut, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function verifyAdminPasswordAction(password: string) {
  try {
    await signIn("credentials", {
      email: "admin@bioarc.com",
      password: password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid administrator password. Access denied." };
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("NEXT_REDIRECT")) {
      return { success: true };
    }
    return { error: "Authentication failed. Access denied." };
  }
}
