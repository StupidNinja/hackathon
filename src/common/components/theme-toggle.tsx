import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/common/components/ui/button";
import { useI18n } from "@/common/i18n/use-i18n";
import { cn } from "@/common/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={toggleTheme}
      aria-label={t("common.toggleTheme")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">{t("common.toggleTheme")}</span>
    </Button>
  );
}
