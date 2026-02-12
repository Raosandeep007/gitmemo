import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services";
import { GITHUB_REACTIONS, type UserSettings } from "@/types/github";

// Query keys factory
export const instanceKeys = {
  all: ["instance"] as const,
  profile: () => [...instanceKeys.all, "profile"] as const,
  settings: () => [...instanceKeys.all, "settings"] as const,
  setting: (key: string) => [...instanceKeys.settings(), key] as const,
};

// Instance profile — hardcoded for GitHub-backed mode
export function useInstanceProfile() {
  return useQuery({
    queryKey: instanceKeys.profile(),
    queryFn: async () => {
      return {
        version: "1.0.0",
        mode: "github",
        admin: true, // Always has admin in single-user mode
      };
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// General setting from repo JSON
export function useGeneralSetting() {
  return useQuery({
    queryKey: instanceKeys.setting("general"),
    queryFn: async () => {
      return {
        registrationAllowed: false,
        passwordAuthAllowed: false,
        customProfile: {
          title: "Memos",
          description: "",
          logoUrl: "",
        },
      };
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// Memo-related setting
export function useMemoRelatedSetting() {
  return useQuery({
    queryKey: instanceKeys.setting("memo_related"),
    queryFn: async () => {
      return {
        contentLengthLimit: 0, // no limit
        reactions: Object.keys(GITHUB_REACTIONS),
      };
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// Hook to fetch a specific instance setting
export function useInstanceSetting(key: string) {
  return useQuery({
    queryKey: instanceKeys.setting(key),
    queryFn: async () => {
      const settings = await settingsService.getSettings();
      return settings;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to update instance setting
export function useUpdateInstanceSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      await settingsService.updateSettings(settings);
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.settings() });
    },
  });
}
