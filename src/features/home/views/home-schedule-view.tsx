import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Clock3,
  Coffee,
  Flag,
  Gavel,
  Hammer,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import aitkLogo from "@/common/assets/partners/AITK-logo.png";
import { scheduleData } from "@/features/home/data/schedule";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

type ScheduleEventType =
  | "general"
  | "main"
  | "work"
  | "checkpoint"
  | "workshop"
  | "break"
  | "pitch"
  | "jury";

type ScheduleEvent = {
  time: string;
  end?: string;
  title: string;
  description?: string;
  location?: string;
  type: ScheduleEventType;
};

type ScheduleDay = {
  date: string;
  dateLabel: string;
  label: string;
  events: ScheduleEvent[];
};

type EventTypeMeta = {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
};

const scheduleDates = ["2026-04-03", "2026-04-04"];

const eventTypeMeta: Record<ScheduleEventType, EventTypeMeta> = {
  general: {
    label: "Общее",
    icon: CalendarClock,
    badgeClassName: "bg-[#d6d1df] text-[#544d63]",
  },
  main: {
    label: "Главная сцена",
    icon: Flag,
    badgeClassName: "bg-[#b89fff]/28 text-[#5b2ab7]",
  },
  work: {
    label: "Работа",
    icon: Hammer,
    badgeClassName: "bg-[#4af8e3]/28 text-[#00675d]",
  },
  checkpoint: {
    label: "Чекпойнт",
    icon: Activity,
    badgeClassName: "bg-[#ff9dac]/28 text-[#9d3553]",
  },
  workshop: {
    label: "Мастер-класс",
    icon: Sparkles,
    badgeClassName: "bg-[#6fa9ff]/24 text-[#25589e]",
  },
  break: {
    label: "Перерыв",
    icon: Coffee,
    badgeClassName: "bg-[#f2cf8c]/30 text-[#7b5a1c]",
  },
  pitch: {
    label: "Питч",
    icon: Sparkles,
    badgeClassName: "bg-[#b89fff]/20 text-[#6840bb]",
  },
  jury: {
    label: "Жюри",
    icon: Gavel,
    badgeClassName: "bg-[#d1b58f]/30 text-[#6e4f24]",
  },
};

const mapCategoryToType = (category: string): ScheduleEventType => {
  switch (category.toLowerCase()) {
    case "general":
      return "general";
    case "work":
      return "work";
    case "checkpoint":
      return "checkpoint";
    case "workshop":
      return "workshop";
    case "food":
      return "break";
    case "pitch":
      return "pitch";
    case "jury":
      return "jury";
    default:
      return "general";
  }
};

const splitDayLabel = (value: string): { label: string; dateLabel: string } => {
  const openParenIndex = value.indexOf("(");
  const closeParenIndex = value.lastIndexOf(")");

  if (openParenIndex === -1 || closeParenIndex === -1 || closeParenIndex <= openParenIndex) {
    return { label: value, dateLabel: value };
  }

  return {
    label: value.slice(0, openParenIndex).trim(),
    dateLabel: value.slice(openParenIndex + 1, closeParenIndex).trim(),
  };
};

const splitTimeRange = (timeRange: string): { start: string; end?: string } => {
  const normalized = timeRange.replace(/\s+/g, " ").trim();
  const [start, end] = normalized.split(" - ");
  return { start, end };
};

const schedule: ScheduleDay[] = scheduleData.map((rawDay, index) => {
  const { label, dateLabel } = splitDayLabel(rawDay.day);

  return {
    date: scheduleDates[index] ?? scheduleDates[scheduleDates.length - 1],
    label,
    dateLabel,
    events: rawDay.events.map((event) => {
      const { start, end } = splitTimeRange(event.time);
      return {
        time: start,
        end,
        title: event.title,
        description: event.description,
        location: event.location,
        type: mapCategoryToType(event.category),
      };
    }),
  };
});

const parseDateWithTime = (date: string, time: string): Date => {
  const [hours, minutes] = time.split(":").map(Number);
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
};

const toIsoDateString = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEventWindow = (day: ScheduleDay, index: number): { start: Date; end: Date } => {
  const event = day.events[index];

  if (event.end) {
    return {
      start: parseDateWithTime(day.date, event.time),
      end: parseDateWithTime(day.date, event.end),
    };
  }

  const eventEnd = parseDateWithTime(day.date, event.time);
  if (index === 0) {
    const fallbackStart = new Date(eventEnd.getTime() - 60 * 60 * 1000);
    return { start: fallbackStart, end: eventEnd };
  }

  const previous = day.events[index - 1];
  const previousBoundary = previous.end ?? previous.time;
  const eventStart = parseDateWithTime(day.date, previousBoundary);

  return { start: eventStart, end: eventEnd };
};

const toRangeLabel = (day: ScheduleDay, index: number): string => {
  const window = getEventWindow(day, index);
  const startHours = String(window.start.getHours()).padStart(2, "0");
  const startMinutes = String(window.start.getMinutes()).padStart(2, "0");
  const endHours = String(window.end.getHours()).padStart(2, "0");
  const endMinutes = String(window.end.getMinutes()).padStart(2, "0");
  return `${startHours}:${startMinutes} - ${endHours}:${endMinutes}`;
};

function LiveNow({ label, title, range }: { label: string; title: string; range: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl bg-[#e8f7ee] px-4 py-3 outline outline-1 outline-[#afacac]/15 sm:px-5"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#22c55e]/14 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <span className="relative inline-flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-70" />
          <span className="absolute inline-flex h-full w-full animate-[ping_2.2s_ease-out_infinite] rounded-full bg-[#22c55e]/40 [animation-delay:300ms]" />
          <span className="relative inline-flex size-3 rounded-full bg-[#22c55e] shadow-[0_0_0_7px_rgba(34,197,94,0.22)]" />
        </span>
        <div className="space-y-1">
          <p className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f7a38]">
            {label}
          </p>
          <p className="text-sm font-semibold text-[#2f2e2e] sm:text-base">{title}</p>
          <p className="[font-family:'Space_Grotesk',sans-serif] text-xs font-semibold tracking-wide text-[#5c5b5b]">
            {range}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function HomeScheduleView() {
  const { t } = useI18n();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  usePageTitle(t("schedule.pageTitle"));

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const activeDay = schedule[selectedDayIndex];
  const currentIsoDate = toIsoDateString(now);

  const liveEventIndex = useMemo(() => {
    return activeDay.events.findIndex((_, index) => {
      const testingDay: ScheduleDay = { ...activeDay, date: currentIsoDate };
      const { start, end } = getEventWindow(testingDay, index);

      return now >= start && now < end;
    });
  }, [activeDay, currentIsoDate, now]);

  const liveEvent = liveEventIndex >= 0 ? activeDay.events[liveEventIndex] : null;

  return (
    <div className="min-h-screen bg-[#f9f6f5] text-[#2f2e2e] [font-family:'Manrope',sans-serif] selection:bg-[#6a1cf6]/30">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-24 h-64 w-64 rounded-full bg-[#4af8e3]/15 blur-[90px]" />
        <div className="absolute right-[-120px] top-[-20px] h-96 w-96 rounded-full bg-[#b89fff]/20 blur-[110px]" />
        <div className="absolute bottom-[-120px] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#ff9dac]/14 blur-[140px]" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#afacac]/20 bg-[#f9f6f5]/80 px-4 py-3 backdrop-blur-[20px] lg:px-12">
        <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-3">
            <img src={aitkLogo} alt={t("home.brand.alt")} className="h-8 w-auto" />
            <span className="[font-family:'Space_Grotesk',sans-serif] text-base font-bold tracking-tight lg:text-xl">
              {t("home.brand.name")}
            </span>
          </div>
          <nav className="order-3 -mx-1 flex w-full gap-4 overflow-x-auto whitespace-nowrap px-1 text-[11px] font-medium uppercase tracking-wide text-[#5c5b5b] [font-family:'Plus_Jakarta_Sans',sans-serif] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:order-none md:mx-0 md:w-auto md:gap-10 md:overflow-visible md:px-0 md:text-sm md:tracking-[0.18em]">
            <Link className="transition-colors hover:text-[#6a1cf6]" to="/">
              {t("home.nav.home")}
            </Link>
            <Link className="text-[#6a1cf6]" to="/schedule">
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
            <span className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5c5b5b]/70">
              {t("home.registrationOpen")}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-4 pb-20 pt-28 lg:px-12 lg:pb-28 lg:pt-32">
        <section className="relative px-1 py-4 sm:px-2 sm:py-6 lg:px-3 lg:py-8">
          <div className="absolute -right-8 top-8 h-40 w-40 rounded-full bg-[#b89fff]/18 blur-[70px]" />
          <p className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6a1cf6]">
            {t("schedule.eyebrow")}
          </p>
          <h1 className="mt-3 [font-family:'Space_Grotesk',sans-serif] text-5xl font-black tracking-[-0.02em] text-[#2f2e2e] sm:text-6xl lg:text-7xl">
            {t("schedule.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#5c5b5b] sm:text-base lg:text-lg">
            {t("schedule.description")}
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full max-w-full items-center gap-2 overflow-x-auto rounded-full bg-[#ece7f4] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
              {schedule.map((day, index) => {
                const isActive = selectedDayIndex === index;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDayIndex(index)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all [font-family:'Plus_Jakarta_Sans',sans-serif] ${
                      isActive
                        ? "bg-[#4af8e3]/25 text-[#00675d]"
                        : "text-[#6d6880] hover:bg-[#e0d9ee] hover:text-[#3e3a49]"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs uppercase tracking-[0.15em] text-[#6a6578] [font-family:'Plus_Jakarta_Sans',sans-serif]">
              {activeDay.dateLabel}
            </div>
          </div>

          <div className="mt-6">
            {liveEvent ? (
              <LiveNow
                label={t("schedule.liveLabel")}
                title={liveEvent.title}
                range={toRangeLabel(activeDay, liveEventIndex)}
              />
            ) : (
              <div className="rounded-2xl bg-[#ece7f4] px-4 py-3 text-sm text-[#5c5b5b] outline outline-1 outline-[#afacac]/15">
                {t("schedule.liveFallback")}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 px-1 py-2 sm:px-2 sm:py-4 lg:mt-10 lg:px-3 lg:py-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6a1cf6]">
                {t("schedule.timelineLabel")}
              </p>
              <p className="text-sm text-[#5c5b5b] sm:text-base">{t("schedule.location")}</p>
            </div>
            <Link
              to="/rules"
              className="inline-flex items-center gap-2 rounded-full bg-[#e0daf0] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4c4263] transition-colors hover:bg-[#d5cdea] hover:text-[#2f2e2e]"
            >
              {t("home.nav.rules")}
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <motion.ul
            key={activeDay.date}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative space-y-0 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-[#afacac]/15 sm:before:left-6"
          >
            {activeDay.events.map((event, index) => {
              const typeStyle = eventTypeMeta[event.type];
              const EventIcon = typeStyle.icon;
              const isLive = liveEventIndex === index;

              return (
                <motion.li
                  key={`${activeDay.date}-${event.time}-${event.title}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="group relative pl-10 pt-5 sm:pl-14"
                >
                  <span className="absolute left-[11px] top-7 h-2.5 w-2.5 rounded-full bg-[#b89fff] shadow-[0_0_0_6px_rgba(184,159,255,0.2)] sm:left-[22px]" />
                  <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-[#b89fff]/12 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex flex-col gap-3 rounded-2xl bg-[#f3f0ef] p-4 outline outline-1 outline-[#afacac]/15 transition-all hover:bg-[#ece7f4] hover:shadow-[inset_0_0_0_4px_rgba(184,159,255,0.2)] sm:flex-row sm:items-start sm:justify-between sm:p-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] [font-family:'Plus_Jakarta_Sans',sans-serif] ${typeStyle.badgeClassName}`}
                        >
                          <EventIcon className="size-3.5" />
                          {typeStyle.label}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f7a38] [font-family:'Plus_Jakarta_Sans',sans-serif]">
                            <span className="size-1.5 rounded-full bg-[#22c55e]" />
                            {t("schedule.liveNowBadge")}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-lg font-semibold text-[#2f2e2e] sm:text-xl">{event.title}</h3>

                      {event.description ? (
                        <p className="max-w-2xl text-sm leading-relaxed text-[#5c5b5b] sm:text-base">
                          {event.description}
                        </p>
                      ) : null}

                      {event.location ? (
                        <p className="inline-flex items-center gap-2 text-sm text-[#4d4b4b]">
                          <span className="[font-family:'Plus_Jakarta_Sans',sans-serif] text-[11px] uppercase tracking-[0.16em] text-[#6a6578]">
                            Локация
                          </span>
                          <span>{event.location}</span>
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 sm:min-w-[140px]">
                      <p className="inline-flex items-center gap-2 [font-family:'Space_Grotesk',sans-serif] text-xl font-bold tracking-[-0.02em] text-[#2f2e2e]">
                        <Clock3 className="size-4 text-[#00675d]" />
                        {event.time}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#6a6578] [font-family:'Plus_Jakarta_Sans',sans-serif]">
                        {event.end ? `${event.time} - ${event.end}` : `${t("schedule.deadlineLabel")}: ${event.time}`}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        </section>
      </main>
    </div>
  );
}
