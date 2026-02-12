import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/hooks/useUserQueries";
import { memoService } from "@/services";
import type { ListMemosRequest, Memo } from "@/types/github";

// Query keys factory for consistent cache management
export const memoKeys = {
  all: ["memos"] as const,
  lists: () => [...memoKeys.all, "list"] as const,
  list: (filters: Partial<ListMemosRequest>) => [...memoKeys.lists(), filters] as const,
  details: () => [...memoKeys.all, "detail"] as const,
  detail: (name: string) => [...memoKeys.details(), name] as const,
  comments: (name: string) => [...memoKeys.all, "comments", name] as const,
};

export function useMemos(request: Partial<ListMemosRequest> = {}) {
  return useQuery({
    queryKey: memoKeys.list(request),
    queryFn: async () => {
      const response = await memoService.listMemos(request);
      return response;
    },
  });
}

export function useInfiniteMemos(request: Partial<ListMemosRequest> = {}, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: memoKeys.list(request),
    queryFn: async ({ pageParam }) => {
      const response = await memoService.listMemos({
        ...request,
        pageToken: pageParam || "",
      });
      return response;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
}

export function useMemo(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: memoKeys.detail(name),
    queryFn: async () => {
      const memo = await memoService.getMemo(name);
      return memo;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 10,
  });
}

export function useCreateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memoToCreate: Partial<Memo>) => {
      const memo = await memoService.createMemo({
        content: memoToCreate.content || "",
        tags: memoToCreate.tags,
        pinned: memoToCreate.pinned,
        attachments: memoToCreate.attachments,
        relations: memoToCreate.relations,
        location: memoToCreate.location,
      });
      return memo;
    },
    onSuccess: (newMemo) => {
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() });
      queryClient.setQueryData(memoKeys.detail(newMemo.name), newMemo);
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useUpdateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ update, updateMask }: { update: Partial<Memo>; updateMask: string[] }) => {
      if (!update.name) throw new Error("Memo name is required for update");
      const memo = await memoService.updateMemo(update.name, update, updateMask);
      return memo;
    },
    onMutate: async ({ update }) => {
      if (!update.name) {
        return { previousMemo: undefined };
      }

      await queryClient.cancelQueries({
        queryKey: memoKeys.detail(update.name),
      });

      const previousMemo = queryClient.getQueryData<Memo>(memoKeys.detail(update.name));

      if (previousMemo) {
        queryClient.setQueryData(memoKeys.detail(update.name), {
          ...previousMemo,
          ...update,
        });
      }

      return { previousMemo };
    },
    onError: (_err, { update }, context) => {
      if (context?.previousMemo && update.name) {
        queryClient.setQueryData(memoKeys.detail(update.name), context.previousMemo);
      }
    },
    onSuccess: (updatedMemo) => {
      queryClient.setQueryData(memoKeys.detail(updatedMemo.name), updatedMemo);
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useDeleteMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      await memoService.deleteMemo(name);
      return name;
    },
    onSuccess: (name) => {
      queryClient.removeQueries({ queryKey: memoKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useMemoComments(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: memoKeys.comments(name),
    queryFn: async () => {
      const comments = await memoService.listMemoComments(name);
      return { memos: comments };
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60,
  });
}
