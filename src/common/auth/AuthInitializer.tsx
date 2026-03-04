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
    setAuthReady(false);

    const {
      data: { subscription },
    } = onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      if (session) {
        setSession(session);
      } else {
        clearSession();
      }
    });

    const bootstrap = async () => {
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          clearSession();
          setAuthReady(true);
        }
      }, 10_000);

      try {
        const { data, error } = await getSession();

        if (!isMounted) {
          return;
        }

        if (error || !data.session) {
          clearSession();
        } else {
          setSession(data.session);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, setAuthReady, setSession]);

  return <>{children}</>;
}
