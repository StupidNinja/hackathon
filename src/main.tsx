import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { AuthInitializer } from "@/common/auth/AuthInitializer";
import { I18nProvider } from "@/common/i18n/i18n-provider";
import { queryClient } from "@/common/query/queryClient";
import { router } from "@/routes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider defaultLocale="ru">
        <QueryClientProvider client={queryClient}>
          <AuthInitializer>
            <RouterProvider router={router} />
          </AuthInitializer>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
);
