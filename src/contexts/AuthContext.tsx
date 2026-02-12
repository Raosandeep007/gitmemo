import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { userKeys } from "@/hooks/useUserQueries";
import { settingsService, userService } from "@/services";
import type { Shortcut, User, UserSettings } from "@/types/github";

interface AuthState {
  currentUser: User | undefined;
  userSettings: UserSettings | undefined;
  shortcuts: Shortcut[];
  isInitialized: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  userGeneralSetting: UserSettings | undefined;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  refetchSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    currentUser: undefined,
    userSettings: undefined,
    shortcuts: [],
    isInitialized: false,
    isLoading: true,
  });

  const fetchUserSettings = useCallback(async () => {
    const [settings, shortcuts] = await Promise.all([settingsService.getSettings(), settingsService.getShortcuts()]);

    return {
      userSettings: {
        ...settings,
        theme: settings.theme ?? settings.appearance ?? "system",
        appearance: settings.appearance ?? settings.theme ?? "system",
      },
      shortcuts,
    };
  }, []);

  const initialize = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const currentUser = await userService.getCurrentUser();

      const settings = await fetchUserSettings();

      setState({
        currentUser,
        ...settings,
        isInitialized: true,
        isLoading: false,
      });

      // Pre-populate React Query cache
      queryClient.setQueryData(userKeys.currentUser(), currentUser);
      queryClient.setQueryData(userKeys.detail(currentUser.name), currentUser);
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      setState({
        currentUser: undefined,
        userSettings: undefined,
        shortcuts: [],
        isInitialized: true,
        isLoading: false,
      });
    }
  }, [fetchUserSettings, queryClient]);

  const logout = useCallback(async () => {
    // In GitHub-backed mode, just clear local state
    setState({
      currentUser: undefined,
      userSettings: undefined,
      shortcuts: [],
      isInitialized: true,
      isLoading: false,
    });
    queryClient.clear();
  }, [queryClient]);

  const refetchSettings = useCallback(async () => {
    if (!state.currentUser) {
      return;
    }
    const settings = await fetchUserSettings();
    setState((current) => ({ ...current, ...settings }));
  }, [fetchUserSettings, state.currentUser]);

  const value = useMemo(
    () => ({
      ...state,
      userGeneralSetting: state.userSettings,
      initialize,
      logout,
      refetchSettings,
    }),
    [state, initialize, logout, refetchSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Convenience hook for just the current user
export function useCurrentUserFromAuth() {
  const { currentUser } = useAuth();
  return currentUser;
}
