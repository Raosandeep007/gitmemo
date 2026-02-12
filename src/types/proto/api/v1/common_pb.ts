import { MemoState } from "@/types/github";

export enum State {
  STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
  NORMAL = MemoState.NORMAL,
  ARCHIVED = MemoState.ARCHIVED,
}
