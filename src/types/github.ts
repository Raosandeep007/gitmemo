export enum MemoState {
  NORMAL = "NORMAL",
  ARCHIVED = "ARCHIVED",
}

export enum MemoRelationType {
  REFERENCE = "REFERENCE",
  COMMENT = "COMMENT",
}

export enum Visibility {
  PRIVATE = "PRIVATE",
  PROTECTED = "PROTECTED",
  PUBLIC = "PUBLIC",
}

export interface Location {
  latitude: number;
  longitude: number;
  placeholder?: string;
}

export interface MemoProperty {
  hasLink?: boolean;
  hasTaskList?: boolean;
  hasCode?: boolean;
}

export interface MemoRelationMemo {
  name: string;
  snippet: string;
}

export interface MemoRelation {
  memo?: MemoRelationMemo;
  relatedMemo?: MemoRelationMemo;
  type: MemoRelationType;
}

export interface MemoReaction {
  name: string;
  creator: string;
  reactionType: string;
  contentId: string;
}

export type Reaction = MemoReaction;

export interface Attachment {
  name: string;
  filename: string;
  externalLink: string;
  type: string;
  size: number;
  sha?: string;
  memo?: string;
  createTime?: Date;
}

export interface Memo {
  name: string;
  uid: number;
  title: string;
  content: string;
  snippet: string;
  tags: string[];
  state: MemoState;
  pinned: boolean;
  creator: string;
  createTime: Date;
  updateTime: Date;
  displayTime: Date;
  visibility: Visibility;
  attachments: Attachment[];
  relations: MemoRelation[];
  reactions: MemoReaction[];
  location?: Location;
  property?: MemoProperty;
  parent?: string;
}

export interface MemoComment extends Memo {
  id?: number;
}

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum UserState {
  NORMAL = "NORMAL",
  ARCHIVED = "ARCHIVED",
}

export interface User {
  name: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  description: string;
  role: UserRole;
  state: UserState;
}

export interface UserStats {
  memoCount: number;
  archivedMemoCount: number;
  tagCount: Record<string, number>;
  memoTypeStats: {
    linkCount: number;
    codeCount: number;
    todoCount: number;
  };
  memoDisplayTimestamps?: Date[];
}

export interface Shortcut {
  name: string;
  id: string;
  title: string;
  filter: string;
}

export interface UserSettings {
  locale: string;
  memoVisibility: string;
  appearance?: string;
  theme?: string;
}

export type GitHubReactionContent = "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes";

export interface ListMemosResponse {
  memos: Memo[];
  nextPageToken: string;
}

export interface ListMemosRequest {
  pageSize: number;
  pageToken: string;
  filter: string;
  state?: MemoState;
  parent?: string;
  orderBy?: string;
}
