import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService, userService } from "@/services";
import type { User, UserSettings } from "@/types/github";

// Query keys factory
export const userKeys = {
  all: ["users"] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (name: string) => [...userKeys.details(), name] as const,
  stats: () => [...userKeys.all, "stats"] as const,
  userStats: (name: string) => [...userKeys.stats(), name] as const,
  currentUser: () => [...userKeys.all, "current"] as const,
  shortcuts: () => [...userKeys.all, "shortcuts"] as const,
  notifications: () => [...userKeys.all, "notifications"] as const,
  byNames: (names: string[]) => [...userKeys.all, "byNames", ...names.sort()] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: userKeys.currentUser(),
    queryFn: async () => {
      const user = await userService.getCurrentUser();
      return user;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUser(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.detail(name),
    queryFn: async () => {
      // In single-user mode, always return current user
      const user = await userService.getCurrentUser();
      return user;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserStats(username?: string) {
  return useQuery({
    queryKey: username ? userKeys.userStats(username) : userKeys.stats(),
    queryFn: async () => {
      const stats = await userService.getUserStats(username);
      return stats;
    },
    enabled: !!username,
  });
}

export function useShortcuts() {
  return useQuery({
    queryKey: userKeys.shortcuts(),
    queryFn: async () => {
      const shortcuts = await settingsService.getShortcuts();
      return shortcuts;
    },
  });
}

export function useNotifications() {
  // No notifications in GitHub-backed mode
  return useQuery({
    queryKey: userKeys.notifications(),
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });
}

export function useTagCounts(forCurrentUser = false) {
  return useQuery({
    queryKey: [...userKeys.stats(), "tagCounts", forCurrentUser ? "current" : "all"],
    queryFn: async () => {
      const stats = await userService.getUserStats();
      return stats.tagCount || {};
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user: _user }: { user: Partial<User>; updateMask: string[] }) => {
      // In single-user mode, user updates are limited
      // Just return the current user (GitHub profile can't be updated via API)
      const currentUser = await userService.getCurrentUser();
      return currentUser;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.detail(updatedUser.name), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.currentUser() });
    },
  });
}

// Hook to fetch user settings
export function useUserSettings(parent?: string) {
  return useQuery({
    queryKey: [...userKeys.all, "settings", parent],
    queryFn: async () => {
      const [settings, shortcuts] = await Promise.all([settingsService.getSettings(), settingsService.getShortcuts()]);
      return { settings, shortcuts };
    },
    enabled: !!parent,
  });
}

// Hook to update user setting
export function useUpdateUserSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ settings }: { settings: Partial<UserSettings> }) => {
      const updated = await settingsService.updateSettings(settings);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all, "settings"] });
    },
  });
}

// Hook to list all users — single user mode
export function useListUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: async () => {
      const user = await userService.getCurrentUser();
      return [user];
    },
  });
}

// Hook to update user general setting (convenience wrapper)
export function useUpdateUserGeneralSetting(currentUserName?: string) {
  const queryClient = useQueryClient();
  void currentUserName;

  return useMutation({
    mutationFn: async ({ generalSetting }: { generalSetting: Partial<UserSettings>; updateMask: string[] }) => {
      const updated = await settingsService.updateSettings(generalSetting);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all, "settings"] });
    },
  });
}

// Hook to fetch multiple users by names — single user mode returns same user
export function useUsersByNames(names: string[]) {
  const enabled = names.length > 0;

  return useQuery({
    queryKey: userKeys.byNames(names),
    queryFn: async () => {
      const user = await userService.getCurrentUser();
      const userMap = new Map<string, User | undefined>();
      for (const name of names) {
        userMap.set(name, user);
      }
      return userMap;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
