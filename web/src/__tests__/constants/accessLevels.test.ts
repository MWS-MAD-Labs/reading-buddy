import { describe, it, expect } from "vitest";

import { normalizeAccessLevels } from "@/constants/accessLevels";

describe("normalizeAccessLevels", () => {
  it("returns the same array when already normalized", () => {
    expect(normalizeAccessLevels(["KINDERGARTEN", "JUNIOR_HIGH"])).toEqual([
      "KINDERGARTEN",
      "JUNIOR_HIGH",
    ]);
  });

  it("parses a Postgres enum array literal", () => {
    expect(normalizeAccessLevels("{KINDERGARTEN,LOWER_ELEMENTARY}")).toEqual([
      "KINDERGARTEN",
      "LOWER_ELEMENTARY",
    ]);
  });

  it("parses a quoted Postgres array literal", () => {
    expect(normalizeAccessLevels('{"KINDERGARTEN","TEACHERS_STAFF"}')).toEqual([
      "KINDERGARTEN",
      "TEACHERS_STAFF",
    ]);
  });

  it("parses a JSON array string", () => {
    expect(normalizeAccessLevels('["UPPER_ELEMENTARY"]')).toEqual([
      "UPPER_ELEMENTARY",
    ]);
  });

  it("drops unknown values and handles nullish input", () => {
    expect(normalizeAccessLevels("{KINDERGARTEN,NOT_A_LEVEL}")).toEqual([
      "KINDERGARTEN",
    ]);
    expect(normalizeAccessLevels(null)).toEqual([]);
    expect(normalizeAccessLevels(undefined)).toEqual([]);
  });
});

