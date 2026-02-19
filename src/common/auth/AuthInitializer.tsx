import type { ReactNode } from "react";
import { useEffect } from "react";
import { getSession, onAuthStateChange } from "@/common/api/supabase";
import { useAuthStore } from "./authStore";

type AuthInitializerProps = {
  children: ReactNode;
};

export function AuthInitializer({ children }: AuthInitializerProps) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const { data, error } = await getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        clearSession();
      } else {
        setSession(data.session);
      }

      setAuthReady(true);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session);
      } else {
        clearSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, setAuthReady, setSession]);

  return <>{children}</>;
}
