import { brotliDecompressSync } from 'node:zlib';

import { CitizensPayload } from '@/lib/types';
import { BLOOD_TYPE_MAP, COLOR_CLASSIFICATION_MODE, COLOR_CLASSIFICATION_PRIORITY, COLOR_RANGES, EYE_COLOR_CODE_MAP, EXACT_COLOR_MAP, GENDER_MAP, HAIR_TYPE_MAP } from '@/lib/server/config-maps';

type RawRecord = Record<string, any>;

function safeGet(data: unknown, ...keys: Array<string | number>): any {
  let current = data as any;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return null;
    }

    try {
      current = Array.isArray(current) ? current[key as number] : current[key];
    } catch {
      return null;
    }
  }

  return current ?? null;
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function normalizeRgb(rgbData: unknown): [number, number, number] | null {
  if (!rgbData || typeof rgbData !== 'object') {
    return null;
  }

  const record = rgbData as RawRecord;
  const r = Number(record.r ?? 0);
  const g = Number(record.g ?? 0);
  const b = Number(record.b ?? 0);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return null;
  }

  if (Math.max(r, g, b) > 1) {
    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(rgb: [number, number, number] | null): string | null {
  if (!rgb) {
    return null;
  }

  return `#${rgb.map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function inRange(value: number, limits: [number, number]): boolean {
  return value >= limits[0] && value <= limits[1];
}

function classifyColorByRanges(rgb: [number, number, number]): string | null {
  const [r, g, b] = rgb;

  for (const [colorName, rules] of Object.entries(COLOR_RANGES)) {
    if (!inRange(r, rules.r) || !inRange(g, rules.g) || !inRange(b, rules.b)) {
      continue;
    }

    if (typeof rules.max_diff === 'number') {
      if (Math.abs(r - g) > rules.max_diff || Math.abs(g - b) > rules.max_diff || Math.abs(r - b) > rules.max_diff) {
        continue;
      }
    }

    if (typeof rules.rb_diff_max === 'number') {
      if (Math.abs(r - b) > rules.rb_diff_max) {
        continue;
      }
    }

    return colorName;
  }

  return null;
}

function classifyGameColor(rgb: [number, number, number] | null): string | null {
  if (!rgb) {
    return null;
  }

  const rgbKey = rgb.join(',');

  if (COLOR_CLASSIFICATION_MODE === 'exact_only') {
    return EXACT_COLOR_MAP[rgbKey] ?? 'unknown';
  }

  if (COLOR_CLASSIFICATION_MODE === 'ranges_only') {
    return classifyColorByRanges(rgb) ?? 'unknown';
  }

  for (const strategy of COLOR_CLASSIFICATION_PRIORITY) {
    if (strategy === 'exact') {
      const exactMatch = EXACT_COLOR_MAP[rgbKey];
      if (exactMatch) {
        return exactMatch;
      }
    }

    if (strategy === 'ranges') {
      const rangeMatch = classifyColorByRanges(rgb);
      if (rangeMatch) {
        return rangeMatch;
      }
    }
  }

  return 'unknown';
}

function getHeightCategory(heightCm: unknown): string | null {
  if (typeof heightCm !== 'number') {
    return null;
  }

  if (heightCm <= 152) return 'Very short';
  if (heightCm <= 167) return 'Short';
  if (heightCm <= 182) return 'Average';
  if (heightCm <= 197) return 'Tall';

  return 'Very tall';
}

function formatPassword(passwordData: unknown): string | null {
  if (!passwordData || typeof passwordData !== 'object') {
    return null;
  }

  const digits = (passwordData as RawRecord).digits;
  if (!Array.isArray(digits)) {
    return null;
  }

  return digits.map((digit) => String(digit)).join('');
}

function extractJobs(data: RawRecord): RawRecord[] {
  const jobs: RawRecord[] = [];

  for (const cityTile of data.cityTiles ?? []) {
    for (const floor of cityTile?.building?.floors ?? []) {
      for (const address of floor?.addresses ?? []) {
        const company = address?.company ?? {};
        for (const job of company.companyRoster ?? []) {
          jobs.push({
            ...(typeof job === 'object' && job ? job : {}),
            company_name: address?.name ?? null,
            company_address_id: address?.id ?? null,
            company_data: company,
            address_data: address,
          });
        }
      }
    }
  }

  return jobs;
}

function buildAddressLookup(data: RawRecord): Map<number, RawRecord> {
  const lookup = new Map<number, RawRecord>();

  for (const cityTile of data.cityTiles ?? []) {
    for (const floor of cityTile?.building?.floors ?? []) {
      for (const address of floor?.addresses ?? []) {
        if (typeof address?.id === 'number') {
          lookup.set(address.id, address);
        }
      }
    }
  }

  return lookup;
}

function buildCitizenLookup(citizens: RawRecord[]): Map<number, RawRecord> {
  const lookup = new Map<number, RawRecord>();

  for (const citizen of citizens) {
    const humanId = asInt(citizen?.humanID);
    if (humanId !== null) {
      lookup.set(humanId, citizen);
    }
  }

  return lookup;
}

function findJobById(jobs: RawRecord[], jobId: number | null): RawRecord | null {
  if (jobId === null) {
    return null;
  }

  return jobs.find((job) => job.id === jobId) ?? null;
}

function resolveRelationName(relationId: number | null, citizenLookup: Map<number, RawRecord>): string | null {
  if (relationId === null || relationId < 0) {
    return null;
  }

  const person = citizenLookup.get(relationId);
  if (!person) {
    return null;
  }

  return person.citizenName || [person.firstName, person.surName].filter(Boolean).join(' ') || null;
}

function extractHairInfo(citizen: RawRecord) {
  const hairRgb = normalizeRgb(safeGet(citizen, 'descriptors', 'hairColour'));

  return {
    type_code: safeGet(citizen, 'descriptors', 'hairType'),
    type_name:
      safeGet(citizen, 'descriptors', 'hairType') !== null
        ? HAIR_TYPE_MAP[safeGet(citizen, 'descriptors', 'hairType')] ?? `Code ${safeGet(citizen, 'descriptors', 'hairType')}`
        : null,
    color_rgb: hairRgb ? [...hairRgb] : null,
    color_hex: rgbToHex(hairRgb),
    color_name: classifyGameColor(hairRgb),
  };
}

function extractEyeInfo(citizen: RawRecord) {
  const eyeCode = safeGet(citizen, 'descriptors', 'eyeColour');

  return {
    code: eyeCode,
    name: eyeCode !== null ? EYE_COLOR_CODE_MAP[eyeCode] ?? `Code ${eyeCode}` : null,
    rgb: null,
    hex: null,
    nearest_name: null,
  };
}

function extractBloodInfo(citizen: RawRecord) {
  const bloodCode = asInt(citizen.blood);

  return {
    code: bloodCode,
    name: bloodCode !== null ? BLOOD_TYPE_MAP[bloodCode] ?? `Code ${bloodCode}` : null,
  };
}

function formatHomeAddress(citizen: RawRecord, addressLookup: Map<number, RawRecord>) {
  const homeId = asInt(citizen.home);
  const homeless = Boolean(citizen.homeless);

  if (homeless) {
    return { id: null, name: 'Homeless' };
  }

  if (homeId === null || homeId < 0) {
    return { id: null, name: null };
  }

  const address = addressLookup.get(homeId);
  if (!address) {
    return { id: homeId, name: `Address ID ${homeId}` };
  }

  return {
    id: homeId,
    name: address.name || address.fullAddress || address.address || `Address ID ${homeId}`,
  };
}

function extractWorkInfo(jobData: RawRecord | null) {
  if (!jobData) {
    return {
      job_id: null,
      company: null,
      address: null,
      position: null,
    };
  }

  const addressData = jobData.address_data ?? {};

  return {
    job_id: jobData.id ?? null,
    company: jobData.company_name ?? null,
    address: addressData.fullAddress || addressData.address || null,
    position: jobData.name || jobData.jobName || jobData.preset || jobData.title || jobData.occupation || null,
  };
}

function buildCitizenCard(
  citizen: RawRecord,
  jobs: RawRecord[],
  addressLookup: Map<number, RawRecord>,
  citizenLookup: Map<number, RawRecord>,
) {
  const firstName = typeof citizen.firstName === 'string' ? citizen.firstName : null;
  const surname = typeof citizen.surName === 'string' ? citizen.surName : null;
  const citizenName = typeof citizen.citizenName === 'string' ? citizen.citizenName : null;
  const fullName = citizenName || [firstName, surname].filter(Boolean).join(' ') || 'Unknown citizen';

  const jobId = asInt(citizen.job);
  const partnerId = asInt(citizen.partner);
  const paramourId = asInt(citizen.paramour);
  const jobData = jobId !== null && jobId > -1 ? findJobById(jobs, jobId) : null;

  return {
    id: citizen.humanID ?? null,
    name: {
      full: fullName,
      first: firstName,
      last: surname,
      abbr: firstName && surname ? `${firstName.slice(0, 1)}.${surname}` : null,
      initials: firstName && surname ? `${firstName.slice(0, 1)}${surname.slice(0, 1)}`.toUpperCase() : null,
    },
    personal: {
      dob: citizen.birthday ?? null,
      gender_code: citizen.gender ?? null,
      gender: citizen.gender !== null && citizen.gender !== undefined ? GENDER_MAP[citizen.gender] ?? `Code ${citizen.gender}` : null,
      height_cm: safeGet(citizen, 'descriptors', 'heightCM'),
      height_category: getHeightCategory(safeGet(citizen, 'descriptors', 'heightCM')),
      weight_kg: safeGet(citizen, 'descriptors', 'weightKG'),
      shoe_size: safeGet(citizen, 'descriptors', 'shoeSize'),
      blood: extractBloodInfo(citizen),
    },
    appearance: {
      eye: extractEyeInfo(citizen),
      hair: extractHairInfo(citizen),
    },
    home: formatHomeAddress(citizen, addressLookup),
    work: extractWorkInfo(jobData),
    relations: {
      partner_id: partnerId !== null && partnerId >= 0 ? partnerId : null,
      partner_name: resolveRelationName(partnerId, citizenLookup),
      paramour_id: paramourId !== null && paramourId >= 0 ? paramourId : null,
      paramour_name: resolveRelationName(paramourId, citizenLookup),
    },
    security: {
      password: formatPassword(citizen.password),
    },
    extra: {
      handwriting: citizen.handwriting ?? null,
      homeless: citizen.homeless ?? null,
      partner_raw: citizen.partner ?? null,
      paramour_raw: citizen.paramour ?? null,
    },
  };
}

export function parseCityObject(data: RawRecord): CitizensPayload {
  const jobs = extractJobs(data);
  const addressLookup = buildAddressLookup(data);
  const citizens = Array.isArray(data.citizens) ? data.citizens : [];
  const citizenLookup = buildCitizenLookup(citizens);

  const cards = citizens
    .map((citizen) => {
      try {
        return buildCitizenCard(citizen, jobs, addressLookup, citizenLookup);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .toSorted((a, b) => (a?.id ?? Number.MAX_SAFE_INTEGER) - (b?.id ?? Number.MAX_SAFE_INTEGER));

  return {
    meta: {
      city_name: data.cityName ?? 'Unknown city',
      population: Number(data.population ?? cards.length),
      seed: String(data.seed ?? ''),
      build: String(data.build ?? ''),
      citizens_count: cards.length,
    },
    citizens: cards as CitizensPayload['citizens'],
  };
}

export function parseCityBuffer(fileBuffer: Buffer, fileName: string): CitizensPayload {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json')) {
    return JSON.parse(fileBuffer.toString('utf-8')) as CitizensPayload;
  }

  const cityBuffer = lowerName.endsWith('.citb')
    ? brotliDecompressSync(fileBuffer.subarray(0, Math.max(0, fileBuffer.length - 4)))
    : fileBuffer;

  const rawData = JSON.parse(cityBuffer.toString('utf-8')) as RawRecord;
  return parseCityObject(rawData);
}
