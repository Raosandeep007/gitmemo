import MemoView from "@/components/MemoView/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { useMemoFilters, useMemoSorting } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import type { Memo } from "@/types/github";
import { MemoState as State } from "@/types/github";

const Archived = () => {
  const user = useCurrentUser();

  // Build filter using unified hook (no shortcuts or pinned filter)
  const memoFilter = useMemoFilters({
    creatorName: user?.name,
    includeShortcuts: false,
    includePinned: false,
  });

  // Get sorting logic using unified hook (pinned first, archived state)
  const { listSort, orderBy } = useMemoSorting({
    pinnedFirst: true,
    state: State.ARCHIVED,
  });

  return (
    <PagedMemoList
      renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showVisibility compact />}
      listSort={listSort}
      state={State.ARCHIVED}
      orderBy={orderBy}
      filter={memoFilter}
    />
  );
};

export default Archived;
