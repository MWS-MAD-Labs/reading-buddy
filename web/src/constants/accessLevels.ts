export const ACCESS_LEVEL_OPTIONS = [
  { value: 'KINDERGARTEN', label: 'Kindergarten' },
  { value: 'LOWER_ELEMENTARY', label: 'Lower Elementary' },
  { value: 'UPPER_ELEMENTARY', label: 'Upper Elementary' },
  { value: 'JUNIOR_HIGH', label: 'Junior High' },
  { value: 'TEACHERS_STAFF', label: 'Teachers / Staff' },
] as const;

export type AccessLevelValue = (typeof ACCESS_LEVEL_OPTIONS)[number]['value'];

const ACCESS_LEVEL_VALUES = new Set<string>(
  ACCESS_LEVEL_OPTIONS.map((option) => option.value),
);

function parsePostgresArrayLiteral(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [];
  }

  const content = trimmed.slice(1, -1);
  if (!content) {
    return [];
  }

  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let escaping = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (inQuotes) {
      if (char === '\\') {
        escaping = true;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      // Fall through to other parsers.
    }
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parsePostgresArrayLiteral(trimmed);
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

export function normalizeAccessLevels(value: unknown): AccessLevelValue[] {
  return normalizeStringArray(value).filter((entry): entry is AccessLevelValue =>
    ACCESS_LEVEL_VALUES.has(entry),
  );
}
