import "@github/relative-time-element";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import "./i18n";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InstanceProvider, useInstance } from "@/contexts/InstanceContext";
import { ViewProvider } from "@/contexts/ViewContext";
import { hasGitHubConfig } from "@/github";
import { queryClient } from "@/lib/query-client";
import GitHubSetup from "@/pages/GitHubSetup";
import router from "./router";
import { applyLocaleEarly } from "./utils/i18n";
import { applyThemeEarly } from "./utils/theme";
import "leaflet/dist/leaflet.css";
import "katex/dist/katex.min.css";

// Apply theme and locale early to prevent flash
applyThemeEarly();
applyLocaleEarly();

// Inner component that initializes contexts
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isInitialized: authInitialized, initialize: initAuth, currentUser } = useAuth();
  const { isInitialized: instanceInitialized, initialize: initInstance } = useInstance();
  const [configReady, setConfigReady] = React.useState(hasGitHubConfig());
  const [initNonce, setInitNonce] = React.useState(0);

  // Initialize app contexts in parallel when config is ready.
  useEffect(() => {
    if (!configReady) {
      return;
    }

    const init = async () => {
      await Promise.all([initInstance(), initAuth()]);
    };
    void init();
  }, [configReady, initAuth, initInstance, initNonce]);

  if (!configReady) {
    return (
      <GitHubSetup
        onConfigured={() => {
          setConfigReady(hasGitHubConfig());
          setInitNonce((prev) => prev + 1);
        }}
      />
    );
  }

  if (!authInitialized || !instanceInitialized) {
    return null;
  }

  if (!currentUser) {
    return (
      <GitHubSetup
        initialError="Failed to authenticate with the saved GitHub configuration."
        onConfigured={() => {
          setConfigReady(hasGitHubConfig());
          setInitNonce((prev) => prev + 1);
        }}
      />
    );
  }

  return <>{children}</>;
}

function Main() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <InstanceProvider>
          <AuthProvider>
            <ViewProvider>
              <AppInitializer>
                <RouterProvider router={router} />
                <Toaster position="top-right" />
              </AppInitializer>
            </ViewProvider>
          </AuthProvider>
        </InstanceProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const container = document.getElementById("root");
const root = createRoot(container as HTMLElement);
root.render(<Main />);
