import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSession } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { LoadingScreen } from "@/common/components/loading-screen";

const CALLBACK_TIMEOUT_MS = 5_000;

const getAuthCallbackType = (search: string, hash: string): string | null => {
  const queryType = new URLSearchParams(search).get("type");
  if (queryType) {
    return queryType;
  }

  if (!hash) {
    return null;
  }

  return new URLSearchParams(hash.replace(/^#/, "")).get("type");
};

export function AuthCallbackView() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const callbackType = getAuthCallbackType(location.search, location.hash);
  const isRecoveryFlow = callbackType === "recovery";

  // Kick off session detection (processes hash tokens from OAuth redirect)
  useEffect(() => {
    void getSession();
  }, []);

  // As soon as a session appears in the store, navigate to the app
  useEffect(() => {
    if (session) {
      void navigate(isRecoveryFlow ? "/auth/reset-password" : "/start", {
        replace: true,
      });
    }
  }, [isRecoveryFlow, navigate, session]);

  // Fallback: if no session arrives within timeout, redirect to auth page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().session) {
        void navigate(isRecoveryFlow ? "/auth/forgot-password" : "/auth", {
          replace: true,
        });
      }
    }, CALLBACK_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isRecoveryFlow, navigate]);

  return <LoadingScreen />;
}

