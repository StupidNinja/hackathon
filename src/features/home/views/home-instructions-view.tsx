import {
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import aitkLogo from "@/common/assets/partners/AITK-logo.png";
import { usePageTitle } from "@/common/hooks/use-page-title";
import type { TranslationKey } from "@/common/i18n/translations";
import { useI18n } from "@/common/i18n/use-i18n";

type InstructionStep = {
  id: number;
  Icon: LucideIcon;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  actionLabelKey: TranslationKey;
  to: string;
};

const instructionSteps: InstructionStep[] = [
  {
    id: 1,
    Icon: BadgeCheck,
    titleKey: "instructions.steps.profile.title",
    descriptionKey: "instructions.steps.profile.description",
    actionLabelKey: "instructions.steps.profile.action",
    to: "/profile",
  },
  {
    id: 2,
    Icon: Users,
    titleKey: "instructions.steps.team.title",
    descriptionKey: "instructions.steps.team.description",
    actionLabelKey: "instructions.steps.team.action",
    to: "/team",
  },
  {
    id: 3,
    Icon: Workflow,
    titleKey: "instructions.steps.checkpoints.title",
    descriptionKey: "instructions.steps.checkpoints.description",
    actionLabelKey: "instructions.steps.checkpoints.action",
    to: "/hackathon",
  },
  {
    id: 4,
    Icon: ClipboardCheck,
    titleKey: "instructions.steps.submission.title",
    descriptionKey: "instructions.steps.submission.description",
    actionLabelKey: "instructions.steps.submission.action",
    to: "/hackathon",
  },
  {
    id: 5,
    Icon: CalendarClock,
    titleKey: "instructions.steps.deadlines.title",
    descriptionKey: "instructions.steps.deadlines.description",
    actionLabelKey: "instructions.steps.deadlines.action",
    to: "/schedule",
  },
  {
    id: 6,
    Icon: FileText,
    titleKey: "instructions.steps.rules.title",
    descriptionKey: "instructions.steps.rules.description",
    actionLabelKey: "instructions.steps.rules.action",
    to: "/rules",
  },
];

export function HomeInstructionsView() {
  const { t } = useI18n();

  usePageTitle(t("instructions.pageTitle"));

  return (
    <div className="min-h-screen bg-[#f9f6f5] text-[#2f2e2e] [font-family:'Manrope',sans-serif] selection:bg-[#6a1cf6]/30">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-24 h-64 w-64 rounded-full bg-[#4af8e3]/12 blur-[90px]" />
        <div className="absolute right-[-120px] top-[-20px] h-96 w-96 rounded-full bg-[#b89fff]/16 blur-[110px]" />
      </div>

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
            <Link className="text-[#6a1cf6]" to="/instructions">
              {t("home.nav.instructions")}
            </Link>
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/rules">
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

      <main className="mx-auto w-full max-w-[1680px] px-4 pb-20 pt-28 lg:px-12 lg:pb-28 lg:pt-32">
        <section className="relative px-1 py-4 sm:px-2 sm:py-6 lg:px-3 lg:py-8">
          <p className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6a1cf6]">
            {t("instructions.eyebrow")}
          </p>
          <h1 className="mt-3 [font-family:'Space_Grotesk',sans-serif] text-4xl font-black tracking-[-0.02em] text-[#2f2e2e] sm:text-5xl lg:text-6xl">
            {t("instructions.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#5c5b5b] sm:text-base lg:text-lg">
            {t("instructions.description")}
          </p>
        </section>

        <section className="mt-6 grid gap-4 px-1 sm:px-2 lg:mt-8 lg:grid-cols-2 lg:gap-5 lg:px-3">
          {instructionSteps.map((step) => {
            const Icon = step.Icon;

            return (
              <article
                key={step.id}
                className="group relative overflow-hidden rounded-2xl bg-[#f3f0ef] p-5 outline-1 outline-[#afacac]/15 transition-all hover:bg-[#ece7f4] hover:shadow-[inset_0_0_0_4px_rgba(184,159,255,0.2)]"
              >
                <div className="absolute -right-8 top-[-30px] h-24 w-24 rounded-full bg-[#b89fff]/12 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ece7f4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5b5b] [font-family:'Plus_Jakarta_Sans',sans-serif]">
                    <Icon className="size-3.5 text-[#6a1cf6]" />
                    {t("instructions.stepLabel", { index: step.id })}
                  </div>
                  <h2 className="[font-family:'Space_Grotesk',sans-serif] text-xl font-bold tracking-tight text-[#2f2e2e]">
                    {t(step.titleKey)}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#5c5b5b] sm:text-base">{t(step.descriptionKey)}</p>
                  {step.id >= 5 ? (
                    <Link
                      to={step.to}
                      className="mt-5 inline-flex items-center rounded-lg bg-[#e0daf0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4c4263] transition-colors hover:bg-[#d5cdea] hover:text-[#2f2e2e] [font-family:'Plus_Jakarta_Sans',sans-serif]"
                    >
                      {t(step.actionLabelKey)}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

      </main>
    </div>
  );
}
