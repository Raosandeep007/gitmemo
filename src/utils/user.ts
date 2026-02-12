import type { User } from "@/types/github";
import { UserRole } from "@/types/github";

export const isSuperUser = (user: User | undefined) => {
  return user && user.role === UserRole.ADMIN;
};
