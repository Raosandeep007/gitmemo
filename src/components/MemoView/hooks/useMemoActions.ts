import toast from "react-hot-toast";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import { handleError } from "@/lib/error";
import type { Memo } from "@/types/github";
import { MemoState } from "@/types/github";
import { useTranslate } from "@/utils/i18n";

export const useMemoActions = (memo: Memo, isArchived: boolean) => {
  const t = useTranslate();
  const { mutateAsync: updateMemo } = useUpdateMemo();

  const archiveMemo = async () => {
    if (isArchived) return;
    try {
      await updateMemo({ update: { name: memo.name, state: MemoState.ARCHIVED }, updateMask: ["state"] });
      toast.success(t("message.archived-successfully"));
    } catch (error: unknown) {
      handleError(error, toast.error, {
        context: "Archive memo",
        fallbackMessage: "Failed to archive memo",
      });
    }
  };

  const unpinMemo = async () => {
    if (!memo.pinned) return;
    await updateMemo({ update: { name: memo.name, pinned: false }, updateMask: ["pinned"] });
  };

  return { archiveMemo, unpinMemo };
};
