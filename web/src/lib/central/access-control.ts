// Central publishes this application-owned permission vocabulary.
export const APP_PERMISSIONS = [
  "dashboard.read",
  "library.read",
  "reading.use",
  "classrooms.manage",
  "library.manage",
  "reviews.moderate",
  "badges.manage",
  "users.manage",
  "broadcasts.manage",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];
export type UserRole = "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
export type CentralIdentitySource = "employee" | "student";

export const PERMISSION_MANIFEST: ReadonlyArray<{
  key: AppPermission;
  description: string;
  requires?: AppPermission[];
}> = [
  { key: "dashboard.read", description: "Open Reading Buddy" },
  {
    key: "library.read",
    description: "Browse the Reading Buddy library",
    requires: ["dashboard.read"],
  },
  {
    key: "reading.use",
    description: "Read books and keep personal reading progress",
    requires: ["library.read"],
  },
  {
    key: "classrooms.manage",
    description: "Manage classrooms, reading lists, and classroom quizzes",
    requires: ["dashboard.read"],
  },
  {
    key: "library.manage",
    description: "Add, edit, and remove library books and quizzes",
    requires: ["library.read"],
  },
  {
    key: "reviews.moderate",
    description: "Review and moderate book reviews",
    requires: ["library.read"],
  },
  {
    key: "badges.manage",
    description: "Create and manage Reading Buddy badges",
    requires: ["dashboard.read"],
  },
  {
    key: "users.manage",
    description: "View the Central-managed Reading Buddy user directory",
    requires: ["dashboard.read"],
  },
  {
    key: "broadcasts.manage",
    description: "Manage Reading Buddy login messages",
    requires: ["dashboard.read"],
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, readonly AppPermission[]> = {
  STUDENT: ["dashboard.read", "library.read", "reading.use"],
  TEACHER: ["dashboard.read", "library.read", "classrooms.manage"],
  LIBRARIAN: [
    "dashboard.read",
    "library.read",
    "library.manage",
    "reviews.moderate",
    "badges.manage",
  ],
  ADMIN: APP_PERMISSIONS,
};

const permissionSet = new Set<string>(APP_PERMISSIONS);
const roleSet = new Set<string>(Object.keys(ROLE_PERMISSIONS));

export function isAppPermission(value: string): value is AppPermission {
  return permissionSet.has(value);
}

export function normalizePermissions(
  values: readonly string[],
): AppPermission[] {
  return Array.from(new Set(values.filter(isAppPermission)));
}

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  permission: AppPermission,
): boolean {
  return Boolean(permissions?.includes(permission));
}

export function centralRoleToUserRole(
  role: string,
  source: CentralIdentitySource,
): UserRole | null {
  if (!roleSet.has(role)) return null;
  const userRole = role as UserRole;
  if (source === "student") return userRole === "STUDENT" ? userRole : null;
  return userRole === "STUDENT" ? null : userRole;
}
