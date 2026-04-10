export type CitizenCard = {
  id: number | null;
  name: {
    full: string;
    first: string | null;
    last: string | null;
    abbr: string | null;
    initials: string | null;
  };
  personal: {
    dob: string | null;
    gender_code: number | null;
    gender: string | null;
    height_cm: number | null;
    height_category: string | null;
    weight_kg: number | null;
    shoe_size: number | null;
    blood: {
      code: number | null;
      name: string | null;
    };
  };
  appearance: {
    eye: {
      code: number | null;
      name: string | null;
      rgb: number[] | null;
      hex: string | null;
      nearest_name: string | null;
    };
    hair: {
      type_code: number | null;
      type_name: string | null;
      color_rgb: number[] | null;
      color_hex: string | null;
      color_name: string | null;
    };
  };
  home: {
    id: number | null;
    name: string | null;
  };
  work: {
    job_id: number | null;
    company: string | null;
    address: string | null;
    position: string | null;
  };
  relations: {
    partner_id: number | null;
    partner_name: string | null;
    paramour_id: number | null;
    paramour_name: string | null;
  };
  security: {
    password: string | null;
  };
  extra: {
    handwriting: string | null;
    homeless: boolean | null;
    partner_raw: number | null;
    paramour_raw: number | null;
  };
};

export type CitizensPayload = {
  meta: {
    city_name: string;
    population: number;
    seed: string;
    build: string;
    citizens_count: number;
  };
  citizens: CitizenCard[];
};

export type VisibilitySettings = {
  showHome: boolean;
  showWork: boolean;
  showRelations: boolean;
  showSecurity: boolean;
  showExtra: boolean;
};

export type SearchMode = 'all' | 'id' | 'name' | 'company' | 'position' | 'home' | 'relations' | 'password';
export type AdvancedFilterField = 'company' | 'position' | 'home' | 'relations' | 'password' | 'hair' | 'eye' | 'blood';
export type AdvancedFilterItem = { id: string; field: AdvancedFilterField; value: string };

export type CitizenFilters = {
  query: string;
  searchMode: SearchMode;
  gender: string;
  heightCategory: string;
  exactHeight: string;
  exactWeight: string;
  advanced: AdvancedFilterItem[];
  sortBy: 'id' | 'name';
};

export const EMPTY_PAYLOAD: CitizensPayload = {
  meta: {
    city_name: 'No city loaded',
    population: 0,
    seed: '',
    build: '',
    citizens_count: 0,
  },
  citizens: [],
};
