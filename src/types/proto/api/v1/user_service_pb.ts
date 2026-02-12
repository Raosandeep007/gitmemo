import { UserRole, UserState } from "@/types/github";

export type { User } from "@/types/github";

export enum User_Role {
  ROLE_UNSPECIFIED = "ROLE_UNSPECIFIED",
  USER = UserRole.USER,
  ADMIN = UserRole.ADMIN,
}

export enum User_State {
  STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
  NORMAL = UserState.NORMAL,
  ARCHIVED = UserState.ARCHIVED,
}

// Legacy descriptor export kept for compatibility with generated auth types.
export const file_api_v1_user_service = {};
