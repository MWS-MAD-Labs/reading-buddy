import type { PoolClient } from "pg";
import type { HubSessionClaims } from "mws-central-auth/server";
import type {
  EmployeeProfile,
  StudentProfile,
} from "mws-central-auth/data-client";
import { centralDataClient } from "@/lib/central/central-config";
import { transaction } from "@/lib/db";
import type {
  AppPermission,
  UserRole,
} from "@/lib/central/access-control";
import type { CentralEntitlement } from "@/lib/central/central-access";

type Identity = Pick<HubSessionClaims, "sub" | "email" | "source">;

export type AccessLevel =
  | "KINDERGARTEN"
  | "LOWER_ELEMENTARY"
  | "UPPER_ELEMENTARY"
  | "JUNIOR_HIGH"
  | "TEACHERS_STAFF";

type ExistingProjection = {
  id: string;
  email: string;
  central_person_id: string | null;
  central_synced_at: Date | null;
  profile_id: string | null;
  full_name: string | null;
  grade: number | null;
  access_level: AccessLevel | null;
};

export type ProjectedCentralUser = {
  id: string;
  profileId: string;
  email: string;
  fullName: string;
  role: UserRole;
  grade: number | null;
  accessLevel: AccessLevel;
  xp: number;
  level: number;
};

export class CentralProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CentralProjectionError";
  }
}

function profileCacheMs(): number {
  const seconds = Number(
    process.env.READING_BUDDY_CENTRAL_PROFILE_CACHE_SECONDS,
  );
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 300) * 1000;
}

export function gradeNumber(gradeName: string): number | null {
  const match = gradeName.match(/\b(?:grade\s*)?(\d{1,2})\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
}

export function accessLevelForGrade(gradeName: string): AccessLevel | null {
  if (/kindergarten|\bpre[- ]?k\b|\bk[12]\b/i.test(gradeName)) {
    return "KINDERGARTEN";
  }
  const grade = gradeNumber(gradeName);
  if (grade !== null && grade <= 3) return "LOWER_ELEMENTARY";
  if (grade !== null && grade <= 6) return "UPPER_ELEMENTARY";
  if (grade !== null && grade <= 9) return "JUNIOR_HIGH";
  return null;
}

async function findByCentralPersonId(
  client: PoolClient,
  personId: string,
): Promise<ExistingProjection | null> {
  const result = await client.query<ExistingProjection>(
    `SELECT
       u.id, u.email, u.central_person_id, u.central_synced_at,
       p.id AS profile_id, p.full_name, p.grade, p.access_level
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.central_person_id = $1`,
    [personId],
  );
  return result.rows[0] ?? null;
}

async function findLinkableEmailUser(
  client: PoolClient,
  email: string,
): Promise<ExistingProjection | null> {
  const result = await client.query<ExistingProjection>(
    `SELECT
       u.id, u.email, u.central_person_id, u.central_synced_at,
       p.id AS profile_id, p.full_name, p.grade, p.access_level
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1)
     ORDER BY u.created_at
     LIMIT 2
     FOR UPDATE OF u`,
    [email],
  );
  if (result.rows.length > 1) {
    throw new CentralProjectionError(
      "More than one local account matches the Central email",
    );
  }
  const user = result.rows[0] ?? null;
  if (user?.central_person_id) {
    throw new CentralProjectionError(
      "The Central email is already linked to another person",
    );
  }
  return user;
}

async function assertEmailAvailable(
  client: PoolClient,
  email: string,
  userId: string,
): Promise<void> {
  const result = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1",
    [email, userId],
  );
  if (result.rows.length > 0) {
    throw new CentralProjectionError(
      "The updated Central email belongs to another local account",
    );
  }
}

type CentralProfile = {
  fullName: string;
  email: string;
  grade: number | null;
  accessLevel: AccessLevel;
};

function studentProjection(
  identity: Identity,
  profile: StudentProfile,
): CentralProfile {
  if (profile.person_id !== identity.sub) {
    throw new CentralProjectionError(
      "Central student profile does not match the Hub identity",
    );
  }
  const accessLevel = accessLevelForGrade(profile.current_grade);
  if (!accessLevel) {
    throw new CentralProjectionError(
      `Central grade is not supported by Reading Buddy: ${profile.current_grade}`,
    );
  }
  return {
    fullName: profile.full_name,
    email: profile.email.trim().toLowerCase(),
    grade: gradeNumber(profile.current_grade),
    accessLevel,
  };
}

function employeeProjection(
  identity: Identity,
  profile: EmployeeProfile,
): CentralProfile {
  if (profile.person_id !== identity.sub) {
    throw new CentralProjectionError(
      "Central employee profile does not match the Hub identity",
    );
  }
  return {
    fullName: profile.full_name,
    email: profile.email.trim().toLowerCase(),
    grade: null,
    accessLevel: "TEACHERS_STAFF",
  };
}

async function loadCentralProfile(identity: Identity): Promise<CentralProfile> {
  const central = centralDataClient();
  if (identity.source === "student") {
    const profile = await central.lookupStudent({ email: identity.email });
    return studentProjection(identity, profile);
  }
  const profile = await central.lookupEmployee({ person_id: identity.sub });
  return employeeProjection(identity, profile);
}

function cachedProfile(
  identity: Identity,
  current: ExistingProjection,
): CentralProfile | null {
  if (
    !current.central_synced_at ||
    Date.now() - current.central_synced_at.getTime() >= profileCacheMs() ||
    !current.full_name ||
    !current.access_level
  ) {
    return null;
  }
  return {
    fullName: current.full_name,
    email: identity.email.trim().toLowerCase(),
    grade: current.grade,
    accessLevel: current.access_level,
  };
}

export async function projectCentralUser(
  identity: Identity,
  entitlement: CentralEntitlement,
  role: UserRole,
  permissions: readonly AppPermission[],
): Promise<ProjectedCentralUser> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      identity.sub,
    ]);

    let current = await findByCentralPersonId(client, identity.sub);
    const cached = current ? cachedProfile(identity, current) : null;
    const profile = cached ?? (await loadCentralProfile(identity));
    const profileRefreshed = cached === null;

    if (current) {
      await assertEmailAvailable(client, profile.email, current.id);
      await client.query(
        `UPDATE users
         SET email = $1, name = $2,
             email_verified = COALESCE(email_verified, NOW()),
             central_source = $3, central_status = 'active',
             central_entitlement_id = $4, central_entitlement_version = $5,
             central_permissions = $6,
             central_synced_at = CASE WHEN $8 THEN NOW() ELSE central_synced_at END,
             updated_at = NOW()
         WHERE id = $7`,
        [
          profile.email,
          profile.fullName,
          identity.source,
          entitlement.id,
          entitlement.version,
          permissions,
          current.id,
          profileRefreshed,
        ],
      );
    } else {
      current = await findLinkableEmailUser(client, profile.email);
      if (current) {
        await client.query(
          `UPDATE users
           SET name = $1, email_verified = COALESCE(email_verified, NOW()),
               central_person_id = $2, central_source = $3,
               central_status = 'active', central_entitlement_id = $4,
               central_entitlement_version = $5, central_permissions = $6,
               central_synced_at = NOW(), updated_at = NOW()
           WHERE id = $7`,
          [
            profile.fullName,
            identity.sub,
            identity.source,
            entitlement.id,
            entitlement.version,
            permissions,
            current.id,
          ],
        );
      } else {
        const created = await client.query<{ id: string }>(
          `INSERT INTO users (
             email, name, email_verified, central_person_id, central_source,
             central_status, central_entitlement_id,
             central_entitlement_version, central_permissions, central_synced_at
           )
           VALUES ($1, $2, NOW(), $3, $4, 'active', $5, $6, $7, NOW())
           RETURNING id`,
          [
            profile.email,
            profile.fullName,
            identity.sub,
            identity.source,
            entitlement.id,
            entitlement.version,
            permissions,
          ],
        );
        current = {
          id: created.rows[0].id,
          email: profile.email,
          central_person_id: identity.sub,
          central_synced_at: new Date(),
          profile_id: null,
          full_name: null,
          grade: null,
          access_level: null,
        };
      }
    }

    const profileResult = await client.query<{
      id: string;
      xp: number;
      level: number;
    }>(
      `INSERT INTO profiles (
         id, user_id, email, full_name, role, grade, access_level,
         xp, level, reading_streak, longest_streak
       )
       VALUES ($1, $1, $2, $3, $4, $5, $6, 0, 1, 0, 0)
       ON CONFLICT (user_id) DO UPDATE
       SET email = EXCLUDED.email, full_name = EXCLUDED.full_name,
           role = EXCLUDED.role, grade = EXCLUDED.grade,
           access_level = EXCLUDED.access_level, updated_at = NOW()
       RETURNING id, xp, level`,
      [
        current.id,
        profile.email,
        profile.fullName,
        role,
        profile.grade,
        profile.accessLevel,
      ],
    );
    const localProfile = profileResult.rows[0];

    return {
      id: current.id,
      profileId: localProfile.id,
      email: profile.email,
      fullName: profile.fullName,
      role,
      grade: profile.grade,
      accessLevel: profile.accessLevel,
      xp: localProfile.xp,
      level: localProfile.level,
    };
  });
}
