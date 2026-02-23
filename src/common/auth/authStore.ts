import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  user: User | null;
  isAuthReady: boolean;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
  setAuthReady: (isReady: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthReady: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clearSession: () => set({ session: null, user: null }),
  setAuthReady: (isAuthReady) => set({ isAuthReady }),
}));
