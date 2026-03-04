import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { LoadingScreen } from "@/common/components/loading-screen";

export function AuthCallbackView() {
  const navigate = useNavigate();
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    void getSession();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    if (session) {
      void navigate("/", { replace: true });
    } else {
      void navigate("/auth", { replace: true });
    }
  }, [isAuthReady, session, navigate]);

  return <LoadingScreen />;
}

