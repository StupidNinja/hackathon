import { useEffect } from "react";

const APP_NAME = "Hackathon 2026";

/**
 * Sets the browser tab title to "Hackathon 2026 | <page>".
 * Pass an empty string to set just the app name.
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = page ? `${APP_NAME} | ${page}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [page]);
}
