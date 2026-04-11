import { AdvancedFilterField, CitizenCard, CitizenFilters } from '@/lib/types';

export function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

type CitizenSearchFields = ReturnType<typeof citizenSearchFields>;

type PreparedFilters = {
  query: string;
  searchMode: CitizenFilters['searchMode'];
  gender: string;
  heightCategory: string;
  exactHeight: number | null;
  exactWeight: number | null;
  advanced: Array<{ field: AdvancedFilterField; value: string }>;
};

function parseExactNumber(filterValue: string): number | null {
  if (!filterValue.trim()) {
    return null;
  }

  const parsed = Number(filterValue.trim());
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function prepareFilters(filters: CitizenFilters): PreparedFilters {
  return {
    query: normalizeText(filters.query),
    searchMode: filters.searchMode,
    gender: normalizeText(filters.gender),
    heightCategory: normalizeText(filters.heightCategory),
    exactHeight: parseExactNumber(filters.exactHeight),
    exactWeight: parseExactNumber(filters.exactWeight),
    advanced: filters.advanced
      .map((item) => ({
        field: item.field,
        value: normalizeText(item.value),
      }))
      .filter((item) => Boolean(item.value)),
  };
}

function matchesSelect(filterValue: string, citizenValue: string | null | undefined): boolean {
  if (!filterValue) {
    return true;
  }

  return normalizeText(citizenValue ?? '') === filterValue;
}

function matchesExactNumber(filterValue: number | null, citizenValue: number | null | undefined): boolean {
  if (filterValue === null) {
    return true;
  }

  return citizenValue === filterValue;
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

function matchesSearch(fields: CitizenSearchFields, filters: PreparedFilters): boolean {
  if (!filters.query) {
    return true;
  }

  if (filters.searchMode === 'id') {
    return fields.id === filters.query;
  }

  return fields[filters.searchMode].includes(filters.query);
}

export function filterCitizens(citizens: CitizenCard[], filters: CitizenFilters): CitizenCard[] {
  const preparedFilters = prepareFilters(filters);
  const needsSearchFields = Boolean(preparedFilters.query) || preparedFilters.advanced.length > 0;

  return citizens.filter((citizen) => {
    let fields: CitizenSearchFields | null = null;
    const getFields = () => {
      if (!fields) {
        fields = citizenSearchFields(citizen);
      }
      return fields;
    };

    if (needsSearchFields && !matchesSearch(getFields(), preparedFilters)) {
      return false;
    }

    if (!matchesSelect(preparedFilters.gender, citizen.personal.gender)) {
      return false;
    }

    if (!matchesSelect(preparedFilters.heightCategory, citizen.personal.height_category)) {
      return false;
    }

    if (!matchesExactNumber(preparedFilters.exactHeight, citizen.personal.height_cm)) {
      return false;
    }

    if (!matchesExactNumber(preparedFilters.exactWeight, citizen.personal.weight_kg)) {
      return false;
    }

    if (!preparedFilters.advanced.length) {
      return true;
    }

    const searchableFields = getFields();
    for (const item of preparedFilters.advanced) {
      if (!searchableFields[item.field].includes(item.value)) {
        return false;
      }
    }

    return true;
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
