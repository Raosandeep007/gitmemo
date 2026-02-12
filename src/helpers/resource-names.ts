import { Visibility } from "@/types/github";

export const userNamePrefix = "users/";
export const memoNamePrefix = "memos/";

export const extractUserIdFromName = (name: string) => {
  return name.split(userNamePrefix).pop() || "";
};

export const extractMemoIdFromName = (name: string) => {
  return name.split(memoNamePrefix).pop() || "";
};

// Helper function to convert Visibility enum value to string name
export const getVisibilityName = (visibility: Visibility): string => {
  return visibility;
};
