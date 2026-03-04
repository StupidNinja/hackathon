import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { LoadingScreen } from "@/common/components/loading-screen";

const CALLBACK_TIMEOUT_MS = 5_000;

export function AuthCallbackView() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);

  // Kick off session detection (processes hash tokens from OAuth redirect)
  useEffect(() => {
    void getSession();
  }, []);

  // As soon as a session appears in the store, navigate to the app
  useEffect(() => {
    if (session) {
      void navigate("/", { replace: true });
    }
  }, [session, navigate]);

  // Fallback: if no session arrives within timeout, redirect to auth page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().session) {
        void navigate("/auth", { replace: true });
      }
    }, CALLBACK_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [navigate]);

  return <LoadingScreen />;
}

