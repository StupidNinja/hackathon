import { ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/common/api/supabase";
import aitkLogo from "@/common/assets/partners/AITK-logo.png";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

const rulesPublicUrl = import.meta.env.VITE_RULES_PUBLIC_URL;
const rulesBucket = import.meta.env.VITE_RULES_BUCKET ?? "public";
const rulesFilePath = import.meta.env.VITE_RULES_FILE_PATH ?? "polozhenie.pdf";

export function HomeRulesView() {
  const { t } = useI18n();
  usePageTitle(t("rules.pageTitle"));

  const { data } = supabase.storage.from(rulesBucket).getPublicUrl(rulesFilePath);
  const rulesPdfUrl = rulesPublicUrl && rulesPublicUrl.length > 0 ? rulesPublicUrl : data.publicUrl;

  return (
    <div className="min-h-screen bg-[#f9f6f5] text-[#2f2e2e] [font-family:'Space_Grotesk',sans-serif] selection:bg-[#6a1cf6]/30">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#afacac]/20 bg-[#f9f6f5]/80 px-4 py-3 backdrop-blur-[20px] lg:px-12">
        <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-3">
            <img src={aitkLogo} alt={t("home.brand.alt")} className="h-8 w-auto" />
            <span className="text-base font-bold tracking-tight lg:text-xl">{t("home.brand.name")}</span>
          </div>
          <nav className="order-3 -mx-1 flex w-full gap-4 overflow-x-auto whitespace-nowrap px-1 text-[11px] font-medium uppercase tracking-wide text-[#5c5b5b] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:order-none md:mx-0 md:w-auto md:gap-10 md:overflow-visible md:px-0 md:text-sm md:tracking-widest">
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/">
              {t("home.nav.home")}
            </Link>
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/schedule">
              {t("home.nav.schedule")}
            </Link>
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/instructions">
              {t("home.nav.instructions")}
            </Link>
            <Link className="text-[#6a1cf6]" to="/rules">
              {t("home.nav.rules")}
            </Link>
          </nav>
          <div className="hidden items-center gap-2 sm:inline-flex">
            <span className="relative inline-flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5c5b5b]/70">
              {t("home.registrationOpen")}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-4 pb-16 pt-28 lg:px-12 lg:pb-24 lg:pt-32">
        <section className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-black leading-[0.9] tracking-tight text-[#2f2e2e] sm:text-5xl lg:text-6xl">
              {t("rules.title")}
            </h1>
            <p className="text-base leading-relaxed text-[#5c5b5b] md:text-lg">{t("rules.description")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={rulesPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[#afacac]/30 bg-[#f9f6f5] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5c5b5b] transition-colors hover:border-[#6a1cf6]/40 hover:text-[#6a1cf6]"
            >
              <ArrowUpRight className="size-4" />
              {t("rules.openNewTab")}
            </a>
            <a
              href={rulesPdfUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#834fff] to-[#ac8eff] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_20px_40px_rgba(106,28,246,0.2)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="size-4" />
              {t("rules.download")}
            </a>
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#afacac]/20 bg-[#131313] p-1 shadow-[0_24px_48px_rgba(0,0,0,0.16)]">
            <iframe
              title={t("rules.viewerTitle")}
              src={rulesPdfUrl}
              className="h-[75vh] w-full rounded-xl bg-white"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
