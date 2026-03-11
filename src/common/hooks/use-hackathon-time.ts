import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getHackathonSettings, getCheckpoints } from "@/common/api/supabase";
import type { CheckpointCode } from "@/common/api/supabase";

export type CheckpointTiming = {
  code: CheckpointCode;
  title: string;
  openTime: Date | null;
  dueTime: Date | null;
  isUpcoming: boolean; // t0 not set, or virtual_now < openTime
  isOpen: boolean; // openTime <= virtual_now <= dueTime
  isLocked: boolean; // virtual_now > dueTime
  timeRemainingMs: number; // ms until due time (0 if locked/upcoming)
};

export type HackathonTimingResult = {
  isLoading: boolean;
  isError: boolean;
  t0: Date | null;
  hasStarted: boolean;
  demoMode: boolean;
  demoOffsetMinutes: number;
  virtualNow: Date;
  checkpoints: CheckpointTiming[];
};

function computeVirtualNow(
  demoMode: boolean,
  demoOffsetMinutes: number,
): Date {
  const base = Date.now();
  return new Date(
    demoMode ? base + demoOffsetMinutes * 60 * 1000 : base,
  );
}

/**
 * Fetches hackathon_settings and checkpoints, then computes per-CP timing.
 * Virtual "now" respects demo_mode + demo_offset_minutes from settings.
 * The virtual clock ticks every second when the hackathon is active.
 */
export function useHackathonTime(): HackathonTimingResult {
  const settingsQuery = useQuery({
    queryKey: ["hackathon-settings"],
    queryFn: getHackathonSettings,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const checkpointsQuery = useQuery({
    queryKey: ["checkpoints"],
    queryFn: getCheckpoints,
    staleTime: 5 * 60_000,
  });

  const settings = settingsQuery.data;
  const demoMode = settings?.demo_mode ?? false;
  const demoOffset = settings?.demo_offset_minutes ?? 0;

  const [virtualNow, setVirtualNow] = useState<Date>(
    () => computeVirtualNow(demoMode, demoOffset),
  );

  // Update every second while hackathon data is loaded
  useEffect(() => {
    if (!settings) return;
    const id = setInterval(() => {
      setVirtualNow(computeVirtualNow(settings.demo_mode, settings.demo_offset_minutes));
    }, 1000);
    return () => clearInterval(id);
  }, [settings]);

  // Sync immediately when settings change (e.g. demo offset adjusted)
  useEffect(() => {
    if (settings) {
      setVirtualNow(computeVirtualNow(settings.demo_mode, settings.demo_offset_minutes));
    }
  }, [settings]);

  const t0 = settings?.t0 ? new Date(settings.t0) : null;
  const hasStarted = t0 !== null && virtualNow >= t0;

  const checkpoints = useMemo<CheckpointTiming[]>(() => {
    const cpRows = checkpointsQuery.data ?? [];
    return cpRows.map((cp) => {
      const openTime = t0
        ? new Date(t0.getTime() + cp.open_offset_minutes * 60 * 1000)
        : null;
      const dueTime = t0
        ? new Date(t0.getTime() + cp.due_offset_minutes * 60 * 1000)
        : null;

      const isUpcoming =
        openTime === null || virtualNow < openTime;
      const isLocked = dueTime !== null && virtualNow > dueTime;
      const isOpen = !isUpcoming && !isLocked;

      const timeRemainingMs =
        dueTime && isOpen
          ? Math.max(0, dueTime.getTime() - virtualNow.getTime())
          : 0;

      return {
        code: cp.code,
        title: cp.title,
        openTime,
        dueTime,
        isUpcoming,
        isOpen,
        isLocked,
        timeRemainingMs,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointsQuery.data, t0?.getTime(), virtualNow]);

  return {
    isLoading: settingsQuery.isLoading || checkpointsQuery.isLoading,
    isError: settingsQuery.isError || checkpointsQuery.isError,
    t0,
    hasStarted,
    demoMode: settings?.demo_mode ?? false,
    demoOffsetMinutes: settings?.demo_offset_minutes ?? 0,
    virtualNow,
    checkpoints,
  };
}

/** Format ms duration as HH:MM:SS */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
