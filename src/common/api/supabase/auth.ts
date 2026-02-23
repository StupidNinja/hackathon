import { supabase } from "./client";

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithPassword = (
  email: string,
  password: string,
  emailRedirectTo: string = `${window.location.origin}/auth/callback`,
) =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

export const signInWithGoogle = (
  redirectTo: string = `${window.location.origin}/auth/callback`,
) =>
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

export const onAuthStateChange = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0],
) => supabase.auth.onAuthStateChange(callback);
