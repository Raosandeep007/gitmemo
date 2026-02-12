export type {
  Location,
  Memo,
  MemoComment,
  MemoReaction as Reaction,
  MemoRelation,
  MemoRelationMemo as MemoRelation_Memo,
  MemoProperty as Memo_Property,
} from "@/types/github";

export { MemoState as State, Visibility } from "@/types/github";
export { MemoRelationType as MemoRelation_Type } from "@/types/github";

// Legacy schema exports kept for compatibility with old imports.
export const LocationSchema = {};
export const MemoRelationSchema = {};
export const MemoRelation_MemoSchema = {};
export const Memo_PropertySchema = {};
