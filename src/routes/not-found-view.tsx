import { Link } from "react-router-dom";
import { toast } from "sonner";
import { signOut } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { Button } from "@/common/components/ui/button";
import { useI18n } from "@/common/i18n/use-i18n";

export function NotFoundView() {
  const { t } = useI18n();
  const session = useAuthStore((state) => state.session);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm text-muted-foreground">{t("notFound.page")}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">{t("notFound.home")}</Link>
        </Button>
        {session && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
          >
            {t("common.signOut")}
          </Button>
        )}
      </div>
    </div>
  );
}
