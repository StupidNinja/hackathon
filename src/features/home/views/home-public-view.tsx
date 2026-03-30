import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Landmark, Network, Rocket } from "lucide-react";
import { usePageTitle } from "@/common/hooks/use-page-title";
import type { TranslationKey } from "@/common/i18n/translations";
import { useI18n } from "@/common/i18n/use-i18n";
import aitkLogo from "@/common/assets/partners/AITK-logo.png";
import alFarabiLogo from "@/common/assets/partners/al-farabi.png";
import almatyHubLogo from "@/common/assets/partners/almaty hub (white).png";
import almatyDigitalLogo from "@/common/assets/partners/almaty_digital.png";
import almatyOblLogo from "@/common/assets/partners/almaty_obl.png";
import ietuLogo from "@/common/assets/partners/IETU.png";
import iituLogo from "@/common/assets/partners/IITU_White_Logo.png";
import kazNaruLogo from "@/common/assets/partners/KazNARU.jpeg";
import qStudyLogo from "@/common/assets/partners/Q-study.png";
import qyshLogo from "@/common/assets/partners/Qazaq Youth Science Hub-2.png";
import satbayevLogo from "@/common/assets/partners/Satabayev-University-logo.png";

type OrganizerCard = {
  logoUrl: string;
  altKey: TranslationKey;
  subtitleKey: TranslationKey;
  Icon: typeof Rocket;
  logoClassName: string;
};

type PartnerLogo = {
  src: string;
  altKey: TranslationKey;
  nameKey: TranslationKey;
  logoClassName: string;
  imageClassName?: string;
};

const organizerCards: OrganizerCard[] = [
  {
    logoUrl: aitkLogo,
    altKey: "home.organizers.aitk.alt",
    subtitleKey: "home.organizers.aitk.subtitle",
    Icon: Rocket,
    logoClassName: "h-20 w-auto",
  },
  {
    logoUrl: almatyOblLogo,
    altKey: "home.organizers.akimat.alt",
    subtitleKey: "home.organizers.akimat.subtitle",
    Icon: Landmark,
    logoClassName: "h-24 w-auto",
  },
  {
    logoUrl: almatyDigitalLogo,
    altKey: "home.organizers.digital.alt",
    subtitleKey: "home.organizers.digital.subtitle",
    Icon: Network,
    logoClassName: "h-20 w-auto",
  },
];

const partnerLogos: PartnerLogo[] = [
  {
    src: alFarabiLogo,
    altKey: "home.partners.farabi.alt",
    nameKey: "home.partners.farabi.name",
    logoClassName: "h-16 w-auto",
  },
  {
    src: iituLogo,
    altKey: "home.partners.iitu.alt",
    nameKey: "home.partners.iitu.name",
    logoClassName: "h-16 w-auto",
    imageClassName: "invert",
  },
  {
    src: almatyHubLogo,
    altKey: "home.partners.almatyHub.alt",
    nameKey: "home.partners.almatyHub.name",
    logoClassName: "h-14 w-auto",
    imageClassName: "invert",
  },
  {
    src: ietuLogo,
    altKey: "home.partners.ietu.alt",
    nameKey: "home.partners.ietu.name",
    logoClassName: "h-14 w-auto",
  },
  {
    src: kazNaruLogo,
    altKey: "home.partners.kaznaru.alt",
    nameKey: "home.partners.kaznaru.name",
    logoClassName: "h-16 w-auto",
  },
  {
    src: qStudyLogo,
    altKey: "home.partners.qstudy.alt",
    nameKey: "home.partners.qstudy.name",
    logoClassName: "h-16 w-auto",
  },
  {
    src: qyshLogo,
    altKey: "home.partners.qysh.alt",
    nameKey: "home.partners.qysh.name",
    logoClassName: "h-16 w-auto",
  },
  {
    src: satbayevLogo,
    altKey: "home.partners.satbayev.alt",
    nameKey: "home.partners.satbayev.name",
    logoClassName: "h-16 w-auto",
  },
];

export function HomePublicView() {
  const { t } = useI18n();
  const partnersScrollerRef = useRef<HTMLDivElement | null>(null);
  const [slideStep, setSlideStep] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(1);
  const prizeValue = t("home.hero.prizeValue");
  const hasTengeSymbol = prizeValue.includes("₸");
  const prizeAmount = hasTengeSymbol ? prizeValue.replace("₸", "").trim() : prizeValue;

  const updateCarouselMetrics = useCallback(() => {
    const scroller = partnersScrollerRef.current;
    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>("[data-partner-card='true']");
    const track = scroller.querySelector<HTMLElement>("[data-partner-track='true']");
    if (!firstCard || !track) {
      return;
    }

    const computedStyles = window.getComputedStyle(track);
    const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || "0") || 0;
    const step = firstCard.offsetWidth + gap;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const slides = step > 0 ? Math.max(1, Math.ceil(maxScroll / step) + 1) : 1;

    setSlideStep(Math.max(step, 1));
    setTotalSlides(slides);
    setActiveSlide((prev) => Math.min(prev, slides - 1));
  }, []);

  useEffect(() => {
    updateCarouselMetrics();
    window.addEventListener("resize", updateCarouselMetrics);

    return () => {
      window.removeEventListener("resize", updateCarouselMetrics);
    };
  }, [updateCarouselMetrics]);

  useEffect(() => {
    if (totalSlides <= 1) {
      return;
    }

    const scroller = partnersScrollerRef.current;
    if (!scroller) {
      return;
    }

    const timerId = window.setInterval(() => {
      const nextSlide = activeSlide >= totalSlides - 1 ? 0 : activeSlide + 1;
      scroller.scrollTo({ left: nextSlide * slideStep, behavior: "smooth" });
      setActiveSlide(nextSlide);
    }, 3500);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeSlide, slideStep, totalSlides]);

  const handleScroll = () => {
    const scroller = partnersScrollerRef.current;
    if (!scroller || slideStep <= 0) {
      return;
    }

    const nextSlide = Math.round(scroller.scrollLeft / slideStep);
    setActiveSlide(Math.min(Math.max(nextSlide, 0), totalSlides - 1));
  };

  const moveCarousel = (direction: "prev" | "next") => {
    const scroller = partnersScrollerRef.current;
    if (!scroller || totalSlides <= 1) {
      return;
    }

    const delta = direction === "next" ? 1 : -1;
    const nextSlide = (activeSlide + delta + totalSlides) % totalSlides;
    scroller.scrollTo({ left: nextSlide * slideStep, behavior: "smooth" });
    setActiveSlide(nextSlide);
  };

  const jumpToSlide = (slideIndex: number) => {
    const scroller = partnersScrollerRef.current;
    if (!scroller || slideIndex < 0 || slideIndex > totalSlides - 1) {
      return;
    }

    scroller.scrollTo({ left: slideIndex * slideStep, behavior: "smooth" });
    setActiveSlide(slideIndex);
  };

  usePageTitle(t("home.pageTitle"));

  return (
    <div className="min-h-screen bg-[#f9f6f5] text-[#2f2e2e] [font-family:'Space_Grotesk',sans-serif] selection:bg-[#6a1cf6]/30">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#afacac]/20 bg-[#f9f6f5]/80 px-4 py-3 backdrop-blur-[20px] lg:px-12">
        <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-3">
            <img src={organizerCards[0].logoUrl} alt={t("home.brand.alt")} className="h-8 w-auto" />
            <span className="text-base font-bold tracking-tight lg:text-xl">{t("home.brand.name")}</span>
          </div>
          <nav className="order-3 -mx-1 flex w-full gap-4 overflow-x-auto whitespace-nowrap px-1 text-[11px] font-medium uppercase tracking-wide text-[#5c5b5b] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:order-none md:mx-0 md:w-auto md:gap-10 md:overflow-visible md:px-0 md:text-sm md:tracking-widest">
            <Link className="text-[#6a1cf6]" to="/">
              {t("home.nav.home")}
            </Link>
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/schedule">
              {t("home.nav.schedule")}
            </Link>
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/instructions">
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

      <main className="mx-auto w-full max-w-[1680px] px-4 lg:px-12">
        <section className="grid min-h-[85vh] items-center gap-8 pb-10 pt-28 lg:min-h-screen lg:grid-cols-2 lg:gap-16 lg:pb-12 lg:pt-24">
          <div className="order-1 flex flex-col justify-center space-y-8 lg:space-y-12">
            <h1 className="leading-[0.85] tracking-tighter">
              <span className="block text-5xl font-black sm:text-6xl md:text-7xl lg:text-[clamp(5rem,8vw,9rem)]">
                {t("home.hero.titleLead")}
              </span>
              <span className="block text-4xl font-black italic text-[#6a1cf6] sm:text-5xl md:text-7xl lg:text-[clamp(4.2rem,7vw,8rem)]">
                {t("home.hero.titleAccent")}
              </span>
            </h1>
            <p className="max-w-md whitespace-pre-line text-base leading-relaxed text-[#5c5b5b] opacity-90 md:text-lg lg:text-xl">
              {t("home.hero.description")}
            </p>
          </div>

          <div className="order-2 flex flex-col items-center justify-center space-y-12 lg:space-y-20">
            <div className="relative hidden aspect-square w-full max-w-[280px] animate-[home-float_8s_ease-in-out_infinite] items-center justify-center md:max-w-[320px] lg:flex lg:max-w-[400px]">
              <div className="absolute inset-0 scale-110 rounded-full bg-[#6a1cf6]/25 blur-[80px]" />
              <div className="relative z-10 flex h-full w-full rotate-[10deg] items-center justify-center overflow-hidden rounded-[3rem] border border-white/20 bg-gradient-to-br from-[#834fff] to-[#ac8eff] shadow-[0_40px_100px_rgba(106,28,246,0.4),inset_0_-10px_20px_rgba(0,0,0,0.1),inset_0_10px_20px_rgba(255,255,255,0.2)] md:rounded-[4rem]">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                <svg
                  className="relative z-10 h-1/2 w-1/2 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>

            <div className="w-full max-w-[480px] space-y-8 sm:space-y-10">
              <div className="rounded-r-xl border-l-4 border-[#6a1cf6] bg-[#6a1cf6]/5 p-6 text-left md:p-8">
                <p className="mb-3 text-[clamp(0.6rem,1.5vw,0.75rem)] font-bold uppercase leading-tight tracking-[0.2em] text-[#6a1cf6]">
                  {t("home.hero.prizeLabel")}
                </p>
                <p className="whitespace-nowrap text-6xl font-black tracking-tighter text-[#2f2e2e] md:text-7xl lg:text-[clamp(4rem,6vw,6rem)]">
                  <span>{prizeAmount}</span>
                  {hasTengeSymbol ? (
                    <span className="ml-3 inline-block align-middle text-[0.78em] leading-none">₸</span>
                  ) : null}
                </p>
                <ul className="mt-4 space-y-1 text-sm font-semibold text-[#5c5b5b] md:text-base">
                  <li>{t("home.hero.prizeFirst")}</li>
                  <li>{t("home.hero.prizeSecond")}</li>
                  <li>{t("home.hero.prizeThird")}</li>
                </ul>
              </div>
              <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-2 sm:gap-8 md:gap-12">
                <div className="space-y-2">
                  <p className="text-[clamp(0.6rem,1.5vw,0.75rem)] font-bold uppercase leading-tight tracking-[0.2em] text-[#00675d]">
                    {t("home.hero.dateLabel")}
                  </p>
                  <p className="text-3xl font-bold tracking-tight md:text-4xl lg:text-[clamp(1.8rem,3vw,2.5rem)]">
                    {t("home.hero.dateValue")}
                  </p>
                  <p className="max-w-[260px] text-[clamp(0.68rem,1.2vw,0.82rem)] leading-relaxed text-[#5c5b5b]">
                    {t("home.hero.dateNote")}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[clamp(0.6rem,1.5vw,0.75rem)] font-bold uppercase leading-tight tracking-[0.2em] text-[#00675d]">
                    {t("home.hero.locationLabel")}
                  </p>
                  <p className="text-3xl font-bold uppercase tracking-tight md:text-4xl lg:text-[clamp(1.8rem,3vw,2.5rem)]">
                    {t("home.hero.locationValue")}
                  </p>
                  <p className="max-w-[180px] text-[clamp(0.7rem,1.2vw,0.875rem)] leading-relaxed text-[#5c5b5b]">
                    {t("home.hero.locationNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20 lg:py-24">
          <h2 className="mb-12 flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-[#5c5b5b]">
            {t("home.organizers.title")}
            <span className="h-px flex-1 bg-[#afacac]/30" />
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {organizerCards.map((card) => (
              <article
                key={card.altKey}
                className="group relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-[#afacac]/30 bg-[#eae7e7] p-6 transition-all hover:border-[#6a1cf6]/40 sm:h-48 sm:p-8"
              >
                <div className="absolute right-0 top-0 p-3 opacity-10 transition-opacity group-hover:opacity-30">
                  <card.Icon className="size-10" />
                </div>
                <img
                  src={card.logoUrl}
                  alt={t(card.altKey)}
                  className={`relative z-10 transition-transform duration-500 group-hover:scale-105 ${card.logoClassName}`}
                />
                <p className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-widest text-[#5c5b5b]/60">
                  {t(card.subtitleKey)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-14 sm:py-20 lg:py-24">
          <h2 className="mb-12 flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-[#5c5b5b]">
            {t("home.partners.title")}
            <span className="h-px flex-1 bg-[#afacac]/30" />
          </h2>
          <div className="relative">
            <div className="mb-4 flex items-center justify-end gap-2">
              <button
                type="button"
                aria-label={t("home.partners.carouselPrev")}
                onClick={() => moveCarousel("prev")}
                className="inline-flex size-8 items-center justify-center rounded-full border border-[#afacac]/30 bg-[#f9f6f5] text-[#5c5b5b] transition-colors hover:border-[#6a1cf6]/40 hover:text-[#6a1cf6]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label={t("home.partners.carouselNext")}
                onClick={() => moveCarousel("next")}
                className="inline-flex size-8 items-center justify-center rounded-full border border-[#afacac]/30 bg-[#f9f6f5] text-[#5c5b5b] transition-colors hover:border-[#6a1cf6]/40 hover:text-[#6a1cf6]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div
              ref={partnersScrollerRef}
              onScroll={handleScroll}
              className="overflow-x-auto overscroll-x-contain pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div data-partner-track="true" className="flex gap-4">
                {partnerLogos.map((partner) => (
                  <article
                    key={partner.altKey}
                    data-partner-card="true"
                    className="group relative flex h-24 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#afacac]/10 bg-[#f3f0ef] px-4 transition-colors hover:border-[#6a1cf6]/40 sm:h-28 sm:w-56"
                  >
                    <img
                      src={partner.src}
                      alt={t(partner.altKey)}
                      loading="lazy"
                      className={`max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105 ${partner.logoClassName} ${partner.imageClassName ?? ""}`}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0e0e0e]/75 via-[#0e0e0e]/45 to-transparent px-2 pb-2 pt-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="text-center text-[10px] font-bold uppercase tracking-wider text-[#f9f6f5]">
                        {t(partner.nameKey)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={t("home.partners.carouselDot", { index: index + 1 })}
                  onClick={() => jumpToSlide(index)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    activeSlide === index ? "bg-[#6a1cf6]" : "bg-[#afacac]/30 hover:bg-[#afacac]/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24 pt-24 text-center sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-36" id="registration">
          <div className="group relative my-6 inline-block sm:my-8 lg:my-10">
            <div className="absolute -inset-4 rounded-xl bg-gradient-to-br from-[#834fff] to-[#ac8eff] opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
            <Link
              to="/auth?mode=sign-up"
              className="relative inline-flex items-center rounded-xl bg-gradient-to-br from-[#834fff] to-[#ac8eff] px-8 py-4 text-base font-black uppercase tracking-[0.2em] text-white shadow-[0_20px_40px_rgba(106,28,246,0.2)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-12 sm:py-6 sm:text-2xl sm:tracking-widest lg:px-16 lg:py-8 lg:text-3xl"
            >
              {t("home.cta.register")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
