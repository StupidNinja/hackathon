import { supabase } from "./client";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const getAuthRedirectUrl = () =>
  import.meta.env.VITE_AUTH_REDIRECT_URL ?? `${window.location.origin}/auth/callback`;

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });

export const signUpWithPassword = (
  email: string,
  password: string,
  emailRedirectTo: string = getAuthRedirectUrl(),
) =>
  supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      emailRedirectTo,
    },
  });

export const signInWithGoogle = (
  redirectTo: string = getAuthRedirectUrl(),
) =>
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

export const signOut = (scope: "global" | "local" | "others" = "global") =>
  supabase.auth.signOut({ scope });

export const getSession = () => supabase.auth.getSession();

export const verifyInviteTokenHash = (tokenHash: string) =>
  supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  });

export const onAuthStateChange = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0],
) => supabase.auth.onAuthStateChange(callback);

/** Update the current user's password via Supabase Auth. */
export const updatePassword = (password: string) =>
  supabase.auth.updateUser({ password });

/**
 * Clear the must_change_password flag in the profiles table.
 * Called after a successful password update so the staff member is no longer
 * forced back to the change-password page.
 */
export async function clearMustChangePassword(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
