export type UserRole =
  | "ADMIN"
  | "DISTRICT_OFFICER"
  | "BLOCK_OFFICER"
  | "VIEWER"
  | "HEAD_MASTER_TEACHER";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}
