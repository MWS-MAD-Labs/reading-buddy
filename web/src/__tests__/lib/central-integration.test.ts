import { afterEach, describe, expect, it } from "vitest";
import {
  APP_PERMISSIONS,
  ROLE_PERMISSIONS,
  centralRoleToUserRole,
  normalizePermissions,
} from "@/lib/central/access-control";
import { validateCentralEntitlement } from "@/lib/central/central-access";
import {
  accessLevelForGrade,
  gradeNumber,
} from "@/lib/central/central-user-projection";

const previousApplicationId = process.env.HUB_SSO_APP_ID;
const previousOrganizationId = process.env.CENTRAL_ORGANIZATION_ID;

afterEach(() => {
  process.env.HUB_SSO_APP_ID = previousApplicationId;
  process.env.CENTRAL_ORGANIZATION_ID = previousOrganizationId;
});

describe("Central role and permission mapping", () => {
  it("keeps students and employee roles in separate audiences", () => {
    expect(centralRoleToUserRole("STUDENT", "student")).toBe("STUDENT");
    expect(centralRoleToUserRole("TEACHER", "employee")).toBe("TEACHER");
    expect(centralRoleToUserRole("ADMIN", "student")).toBeNull();
    expect(centralRoleToUserRole("STUDENT", "employee")).toBeNull();
  });

  it("drops duplicate and unknown permissions", () => {
    expect(
      normalizePermissions([
        "dashboard.read",
        "unknown.permission",
        "dashboard.read",
      ]),
    ).toEqual(["dashboard.read"]);
  });

  it("accepts a matching canonical entitlement", () => {
    process.env.HUB_SSO_APP_ID = "reading-buddy";
    process.env.CENTRAL_ORGANIZATION_ID = "org_reading";
    const result = validateCentralEntitlement("person-1", "student", {
      id: "group:students",
      person_id: "person-1",
      application_id: "reading-buddy",
      organization_id: "org_reading",
      role: "STUDENT",
      permissions: [...ROLE_PERMISSIONS.STUDENT],
      version: 1,
      is_active: true,
    });
    expect(result.role).toBe("STUDENT");
    expect(result.permissions).toEqual(ROLE_PERMISSIONS.STUDENT);
  });

  it("rejects an entitlement with unknown permissions", () => {
    process.env.HUB_SSO_APP_ID = "reading-buddy";
    process.env.CENTRAL_ORGANIZATION_ID = "org_reading";
    expect(() =>
      validateCentralEntitlement("person-1", "employee", {
        id: "ent-1",
        person_id: "person-1",
        application_id: "reading-buddy",
        organization_id: "org_reading",
        role: "ADMIN",
        permissions: [...APP_PERMISSIONS, "misspelled.permission"],
        version: 1,
        is_active: true,
      }),
    ).toThrow("Central entitlement is invalid");
  });

  it("fails closed when Central returns malformed permissions", () => {
    process.env.HUB_SSO_APP_ID = "reading-buddy";
    process.env.CENTRAL_ORGANIZATION_ID = "org_reading";
    expect(() =>
      validateCentralEntitlement("person-1", "student", {
        id: "ent-1",
        person_id: "person-1",
        application_id: "reading-buddy",
        organization_id: "org_reading",
        role: "STUDENT",
        permissions: null,
        version: 1,
        is_active: true,
      } as never),
    ).toThrow("Central entitlement is invalid");
  });
});

describe("Central grade projection", () => {
  it.each([
    ["Kindergarten K1", "KINDERGARTEN"],
    ["Grade 1", "LOWER_ELEMENTARY"],
    ["Grade 3", "LOWER_ELEMENTARY"],
    ["Grade 4", "UPPER_ELEMENTARY"],
    ["Grade 6", "UPPER_ELEMENTARY"],
    ["Grade 7", "JUNIOR_HIGH"],
    ["Grade 9", "JUNIOR_HIGH"],
  ])("maps %s to %s", (grade, expected) => {
    expect(accessLevelForGrade(grade)).toBe(expected);
  });

  it("fails closed for unsupported grades", () => {
    expect(accessLevelForGrade("Grade 10")).toBeNull();
    expect(accessLevelForGrade("Unknown")).toBeNull();
  });

  it("extracts a numeric grade without inventing kindergarten numbers", () => {
    expect(gradeNumber("Grade 7")).toBe(7);
    expect(gradeNumber("Kindergarten K2")).toBeNull();
  });
});
