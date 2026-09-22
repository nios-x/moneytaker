"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdmin, signIn, signOut } from "@/lib/admin-auth";
import { setStatus, type RegistrationStatus } from "@/lib/registrations";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter the password" };

  // Blunt brake on scripted guessing. A single-page guest list needs no more.
  await new Promise((r) => setTimeout(r, 400));

  if (!(await signIn(password))) return { error: "That password doesn't match" };

  revalidatePath("/admin");
  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut();
  revalidatePath("/admin");
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "submitted", "paid", "cancelled"]),
});

export async function setStatusAction(formData: FormData): Promise<void> {
  // Every Server Action is reachable by direct POST, so authorization is
  // checked here rather than relying on the page that rendered the button.
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) throw new Error("Bad request");

  const { id, status } = parsed.data as { id: string; status: RegistrationStatus };
  await setStatus(id, status);

  revalidatePath("/admin");
}
