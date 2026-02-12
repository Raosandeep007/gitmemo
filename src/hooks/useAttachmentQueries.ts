import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentService } from "@/services";

// Query keys factory
export const attachmentKeys = {
  all: ["attachments"] as const,
  lists: () => [...attachmentKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...attachmentKeys.lists(), filters] as const,
  details: () => [...attachmentKeys.all, "detail"] as const,
  detail: (name: string) => [...attachmentKeys.details(), name] as const,
};

// Hook to fetch attachments
export function useAttachments() {
  return useQuery({
    queryKey: attachmentKeys.lists(),
    queryFn: async () => {
      const attachments = await attachmentService.listAttachments();
      return attachments;
    },
  });
}

// Hook to create/upload attachment
export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const result = await attachmentService.createAttachment(file);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
    },
  });
}

// Hook to delete attachment
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, sha }: { name: string; sha: string }) => {
      await attachmentService.deleteAttachment(name, sha);
      return name;
    },
    onSuccess: (name) => {
      queryClient.removeQueries({ queryKey: attachmentKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
    },
  });
}
