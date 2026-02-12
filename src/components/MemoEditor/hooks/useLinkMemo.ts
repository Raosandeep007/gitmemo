import { useState } from "react";
import useDebounce from "react-use/lib/useDebounce";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE } from "@/helpers/consts";
import useCurrentUser from "@/hooks/useCurrentUser";
import { memoService } from "@/services";
import type { Memo, MemoRelation } from "@/types/github";
import { MemoRelationType } from "@/types/github";

interface UseLinkMemoParams {
  isOpen: boolean;
  currentMemoName?: string;
  existingRelations: MemoRelation[];
  onAddRelation: (relation: MemoRelation) => void;
}

export const useLinkMemo = ({ isOpen, currentMemoName, existingRelations, onAddRelation }: UseLinkMemoParams) => {
  const user = useCurrentUser();
  const [searchText, setSearchText] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [fetchedMemos, setFetchedMemos] = useState<Memo[]>([]);

  const filteredMemos = fetchedMemos.filter(
    (memo) => memo.name !== currentMemoName && !existingRelations.some((relation) => relation.relatedMemo?.name === memo.name),
  );

  useDebounce(
    async () => {
      if (!isOpen) return;

      setIsFetching(true);
      try {
        const conditions = [`creator == "${user?.name ?? ""}"`];
        if (searchText) {
          conditions.push(`content.contains("${searchText}")`);
        }
        const { memos } = await memoService.listMemos({
          pageSize: DEFAULT_LIST_MEMOS_PAGE_SIZE,
          filter: conditions.join(" && "),
        });
        setFetchedMemos(memos);
      } catch (error) {
        console.error(error);
      } finally {
        setIsFetching(false);
      }
    },
    300,
    [isOpen, searchText, user?.name],
  );

  const addMemoRelation = (memo: Memo) => {
    onAddRelation({
      type: MemoRelationType.REFERENCE,
      relatedMemo: {
        name: memo.name,
        snippet: memo.snippet,
      },
      memo: currentMemoName ? { name: currentMemoName, snippet: "" } : undefined,
    });
  };

  return {
    searchText,
    setSearchText,
    isFetching,
    filteredMemos,
    addMemoRelation,
  };
};
