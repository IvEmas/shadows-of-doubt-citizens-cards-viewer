import { AdvancedFilterField, CitizenCard, CitizenFilters } from '@/lib/types';

export function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function matchesSelect(filterValue: string, citizenValue: string | null | undefined): boolean {
  if (!filterValue) {
    return true;
  }

  return normalizeText(citizenValue ?? '') === normalizeText(filterValue);
}

function matchesExactNumber(filterValue: string, citizenValue: number | null | undefined): boolean {
  if (!filterValue.trim()) {
    return true;
  }

  const parsed = Number(filterValue.trim());
  if (Number.isNaN(parsed)) {
    return true;
  }

  return citizenValue === parsed;
}

function joinSearchParts(parts: Array<string | number | null | undefined>): string {
  return normalizeText(parts.filter((part) => part !== null && part !== undefined && part !== '').join(' '));
}

function citizenSearchFields(citizen: CitizenCard) {
  return {
    all: joinSearchParts([
      citizen.id,
      citizen.name.full,
      citizen.name.first,
      citizen.name.last,
      citizen.name.abbr,
      citizen.personal.gender,
      citizen.personal.height_category,
      citizen.personal.height_cm,
      citizen.personal.weight_kg,
      citizen.personal.dob,
      citizen.personal.blood?.name,
      citizen.appearance.eye?.name,
      citizen.appearance.hair?.type_name,
      citizen.appearance.hair?.color_name,
      citizen.appearance.hair?.color_hex,
      citizen.home.name,
      citizen.work.company,
      citizen.work.position,
      citizen.work.address,
      citizen.relations.partner_name,
      citizen.relations.paramour_name,
      citizen.extra.handwriting,
      citizen.security.password,
      citizen.extra.homeless ? 'homeless' : 'has home',
    ]),
    id: joinSearchParts([citizen.id]),
    name: joinSearchParts([citizen.name.full, citizen.name.first, citizen.name.last, citizen.name.abbr, citizen.name.initials]),
    company: joinSearchParts([citizen.work.company]),
    position: joinSearchParts([citizen.work.position]),
    home: joinSearchParts([citizen.home.name]),
    relations: joinSearchParts([citizen.relations.partner_name, citizen.relations.paramour_name]),
    password: joinSearchParts([citizen.security.password]),
    hair: joinSearchParts([citizen.appearance.hair?.type_name, citizen.appearance.hair?.color_name, citizen.appearance.hair?.color_hex]),
    eye: joinSearchParts([citizen.appearance.eye?.name]),
    blood: joinSearchParts([citizen.personal.blood?.name]),
  };
}

function matchesSearch(citizen: CitizenCard, filters: CitizenFilters): boolean {
  const normalizedQuery = normalizeText(filters.query);
  if (!normalizedQuery) {
    return true;
  }

  const fields = citizenSearchFields(citizen);

  if (filters.searchMode === 'id') {
    return fields.id === normalizedQuery;
  }

  return fields[filters.searchMode].includes(normalizedQuery);
}

function matchesAdvancedField(citizen: CitizenCard, field: AdvancedFilterField, value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const normalized = normalizeText(value);
  const fields = citizenSearchFields(citizen);
  return fields[field].includes(normalized);
}

export function filterCitizens(citizens: CitizenCard[], filters: CitizenFilters): CitizenCard[] {
  const filtered = citizens.filter((citizen) => {
    if (!matchesSearch(citizen, filters)) {
      return false;
    }

    if (!matchesSelect(filters.gender, citizen.personal.gender)) {
      return false;
    }

    if (!matchesSelect(filters.heightCategory, citizen.personal.height_category)) {
      return false;
    }

    if (!matchesExactNumber(filters.exactHeight, citizen.personal.height_cm)) {
      return false;
    }

    if (!matchesExactNumber(filters.exactWeight, citizen.personal.weight_kg)) {
      return false;
    }

    for (const item of filters.advanced) {
      if (!matchesAdvancedField(citizen, item.field, item.value)) {
        return false;
      }
    }

    return true;
  });

  return filtered.toSorted((a, b) => {
    if (filters.sortBy === 'name') {
      return safeString(a.name.full).localeCompare(safeString(b.name.full));
    }

    return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
  });
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => safeString(value).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function buildFilterOptions(citizens: CitizenCard[]) {
  return {
    genders: uniqueSorted(citizens.map((citizen) => citizen.personal.gender)),
    heightCategories: uniqueSorted(citizens.map((citizen) => citizen.personal.height_category)),
  };
}
