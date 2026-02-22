import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Warns users before navigating away from a page with unsaved changes.
 *
 * Handles both:
 * - In-app navigation (React Router `useBlocker`) — returns blocker state
 *   so the caller can render a shadcn dialog.
 * - Browser close / reload (`beforeunload` event)
 *
 * Call `confirmLeave()` before a programmatic navigation (e.g. after a
 * successful save) to bypass the blocker synchronously, avoiding the race
 * where `isDirty` is still true in the current render cycle.
 */
export function useUnsavedChanges(isDirty: boolean) {
  // Use refs so the blocker function reads the latest value at navigation
  // time rather than the stale value from the last render.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const confirmedRef = useRef(false);

  const blocker = useBlocker(() => !confirmedRef.current && isDirtyRef.current);

  // Reset the bypass flag after a successful (unblocked) navigation so it
  // doesn't linger for subsequent navigations on the same mount.
  useEffect(() => {
    if (blocker.state === "unblocked") {
      confirmedRef.current = false;
    }
  }, [blocker.state]);

  // Browser close / refresh
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return {
    isBlocked: blocker.state === "blocked",
    proceed: () => blocker.state === "blocked" && blocker.proceed(),
    reset: () => blocker.state === "blocked" && blocker.reset(),
    /** Call this synchronously before navigating after a successful save. */
    confirmLeave: () => {
      confirmedRef.current = true;
    },
  };
}
