import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


INPUT_FILE = "Files/Yokohama.0.4202.7arIXeHq470JB1lq.cit"
OUTPUT_JSON = "citizens_cards.json"


from config_maps import (
    BLOOD_TYPE_MAP,
    COLOR_CLASSIFICATION_MODE,
    COLOR_CLASSIFICATION_PRIORITY,
    COLOR_RANGES,
    EYE_COLOR_CODE_MAP,
    EXACT_COLOR_MAP,
    GENDER_MAP,
    HAIR_TYPE_MAP,
)

def safe_get(data: Any, *keys: Any, default: Any = None) -> Any:
    current = data
    for key in keys:
        try:
            if isinstance(current, list):
                current = current[key]
            else:
                current = current.get(key)
        except (IndexError, KeyError, TypeError, AttributeError):
            return default

        if current is None:
            return default
    return current


def normalize_rgb(rgb_data: Optional[Dict[str, Any]]) -> Optional[Tuple[int, int, int]]:
    if not isinstance(rgb_data, dict):
        return None

    try:
        r = rgb_data.get("r", 0)
        g = rgb_data.get("g", 0)
        b = rgb_data.get("b", 0)

        if max(r, g, b) > 1:
            return int(r), int(g), int(b)

        return (
            int(round(r * 255)),
            int(round(g * 255)),
            int(round(b * 255)),
        )
    except (TypeError, ValueError):
        return None


def rgb_to_hex(rgb: Optional[Tuple[int, int, int]]) -> Optional[str]:
    if rgb is None:
        return None
    return "#{:02X}{:02X}{:02X}".format(*rgb)

def _in_range(value: int, limits: Tuple[int, int]) -> bool:
    return limits[0] <= value <= limits[1]


def classify_color_by_ranges(rgb: Tuple[int, int, int]) -> Optional[str]:
    r, g, b = rgb

    for color_name, rules in COLOR_RANGES.items():
        if not (_in_range(r, rules['r']) and _in_range(g, rules['g']) and _in_range(b, rules['b'])):
            continue

        max_diff = rules.get('max_diff')
        if max_diff is not None:
            if abs(r - g) > max_diff or abs(g - b) > max_diff or abs(r - b) > max_diff:
                continue

        rb_diff_max = rules.get('rb_diff_max')
        if rb_diff_max is not None and abs(r - b) > rb_diff_max:
            continue

        return color_name

    return None


def classify_game_color(rgb: Optional[Tuple[int, int, int]]) -> Optional[str]:
    if rgb is None:
        return None

    if COLOR_CLASSIFICATION_MODE == 'exact_only':
        return EXACT_COLOR_MAP.get(rgb, 'unknown')

    if COLOR_CLASSIFICATION_MODE == 'ranges_only':
        return classify_color_by_ranges(rgb) or 'unknown'

    for strategy in COLOR_CLASSIFICATION_PRIORITY:
        if strategy == 'exact':
            exact_match = EXACT_COLOR_MAP.get(rgb)
            if exact_match:
                return exact_match

        if strategy == 'ranges':
            ranged_match = classify_color_by_ranges(rgb)
            if ranged_match:
                return ranged_match

    return 'unknown'

def get_height_category(height_cm: Optional[float]) -> Optional[str]:
    if height_cm is None:
        return None

    if height_cm <= 152:
        return "Very short"
    if 153 <= height_cm <= 167:
        return "Short"
    if 168 <= height_cm <= 182:
        return "Average"
    if 183 <= height_cm <= 197:
        return "Tall"
    return "Very tall"


def format_password(password_data: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(password_data, dict):
        return None

    digits = password_data.get("digits")
    if isinstance(digits, list):
        return "".join(str(d) for d in digits)
    return None


def format_gender(gender_code: Optional[int]) -> Optional[str]:
    if gender_code is None:
        return None
    return GENDER_MAP.get(gender_code, f"Code {gender_code}")


def extract_jobs(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    jobs: List[Dict[str, Any]] = []

    for city_tile in data.get("cityTiles", []):
        building = city_tile.get("building") or {}
        floors = building.get("floors") or []

        for floor in floors:
            addresses = floor.get("addresses") or []

            for address in addresses:
                company = address.get("company") or {}
                roster = company.get("companyRoster") or []

                for job in roster:
                    job_item: Dict[str, Any] = job.copy() if isinstance(job, dict) else {}
                    job_item["company_name"] = address.get("name")
                    job_item["company_address_id"] = address.get("id")
                    job_item["company_data"] = company
                    job_item["address_data"] = address
                    jobs.append(job_item)

    return jobs


def build_address_lookup(data: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    address_lookup: Dict[int, Dict[str, Any]] = {}

    for city_tile in data.get("cityTiles", []):
        building = city_tile.get("building") or {}
        floors = building.get("floors") or []

        for floor in floors:
            addresses = floor.get("addresses") or []
            for address in addresses:
                address_id = address.get("id")
                if address_id is not None:
                    address_lookup[address_id] = address

    return address_lookup


def find_job_by_id(jobs: List[Dict[str, Any]], job_id: int) -> Optional[Dict[str, Any]]:
    for job in jobs:
        if job.get("id") == job_id:
            return job
    return None


def extract_hair_info(citizen: Dict[str, Any]) -> Dict[str, Any]:
    hair_rgb_raw = safe_get(citizen, "descriptors", "hairColour")
    hair_rgb = normalize_rgb(hair_rgb_raw)

    return {
        "type_code": safe_get(citizen, "descriptors", "hairType"),
        "type_name": HAIR_TYPE_MAP.get(
            safe_get(citizen, "descriptors", "hairType"),
            f"Code {safe_get(citizen, 'descriptors', 'hairType')}"
        ) if safe_get(citizen, "descriptors", "hairType") is not None else None,
        "color_rgb": list(hair_rgb) if hair_rgb else None,
        "color_hex": rgb_to_hex(hair_rgb),
        "color_name": classify_game_color(hair_rgb),
    }


def extract_eye_info(citizen: Dict[str, Any]) -> Dict[str, Any]:
    eye_code = safe_get(citizen, "descriptors", "eyeColour")
    return {
        "code": eye_code,
        "name": EYE_COLOR_CODE_MAP.get(eye_code, f"Code {eye_code}") if eye_code is not None else None,
        "rgb": None,
        "hex": None,
        "nearest_name": None,
    }


def extract_blood_info(citizen: Dict[str, Any]) -> Dict[str, Any]:
    blood_code = as_int(citizen.get("blood"))
    return {
        "code": blood_code,
        "name": BLOOD_TYPE_MAP.get(blood_code, f"Code {blood_code}") if blood_code is not None else None,
    }


def as_int(value: Any) -> Optional[int]:
    return value if isinstance(value, int) else None


def format_home_address(citizen: Dict[str, Any], address_lookup: Dict[int, Dict[str, Any]]) -> Dict[str, Any]:
    home_id = as_int(citizen.get("home"))
    homeless = citizen.get("homeless", False)

    if homeless:
        return {
            "id": None,
            "name": "Homeless",
        }

    if home_id is None or home_id < 0:
        return {
            "id": None,
            "name": None,
        }

    address = address_lookup.get(home_id)
    if not address:
        return {
            "id": home_id,
            "name": f"Address ID {home_id}",
        }

    return {
        "id": home_id,
        "name": (
            address.get("name")
            or address.get("fullAddress")
            or address.get("address")
            or f"Address ID {home_id}"
        )
    }


def extract_work_info(job_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not job_data:
        return {
            "job_id": None,
            "company": None,
            "address": None,
            "position": None,
        }

    address_data = job_data.get("address_data") or {}

    company = job_data.get("company_name")

    position = (
        job_data.get("name")
        or job_data.get("jobName")
        or job_data.get("preset")
        or job_data.get("title")
        or job_data.get("occupation")
    )

    address_name = (
        address_data.get("fullAddress")
        or address_data.get("address")
    )

    return {
        "job_id": job_data.get("id"),
        "company": company,
        "address": address_name,
        "position": position,
    }


def build_citizen_lookup(citizens: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    lookup: Dict[int, Dict[str, Any]] = {}
    for citizen in citizens:
        human_id = as_int(citizen.get("humanID"))
        if human_id is not None:
            lookup[human_id] = citizen
    return lookup


def resolve_relation_name(
    relation_id: Optional[int],
    citizen_lookup: Dict[int, Dict[str, Any]]
) -> Optional[str]:
    if relation_id is None or relation_id < 0:
        return None

    person = citizen_lookup.get(relation_id)
    if not person:
        return None

    return person.get("citizenName") or f"{person.get('firstName', '')} {person.get('surName', '')}".strip() or None


def build_citizen_card(
    citizen: Dict[str, Any],
    jobs: List[Dict[str, Any]],
    address_lookup: Dict[int, Dict[str, Any]],
    citizen_lookup: Dict[int, Dict[str, Any]],
) -> Dict[str, Any]:
    first_name_raw = citizen.get("firstName")
    surname_raw = citizen.get("surName")
    citizen_name_raw = citizen.get("citizenName")

    first_name: Optional[str] = first_name_raw if isinstance(first_name_raw, str) else None
    surname: Optional[str] = surname_raw if isinstance(surname_raw, str) else None
    citizen_name: Optional[str] = citizen_name_raw if isinstance(citizen_name_raw, str) else None

    full_name = citizen_name or f"{first_name or ''} {surname or ''}".strip()

    abbr_name: Optional[str] = None
    initials: Optional[str] = None

    if first_name is not None and surname is not None:
        abbr_name = f"{first_name[:1]}.{surname}"
        initials = f"{first_name[:1]}{surname[:1]}".upper()

    job_id = as_int(citizen.get("job"))
    job_data = find_job_by_id(jobs, job_id) if job_id is not None and job_id > -1 else None

    partner_id = as_int(citizen.get("partner"))
    paramour_id = as_int(citizen.get("paramour"))

    return {
        "id": citizen.get("humanID"),

        "name": {
            "full": full_name,
            "first": first_name,
            "last": surname,
            "abbr": abbr_name,
            "initials": initials,
        },

        "personal": {
        "dob": citizen.get("birthday"),
        "gender_code": citizen.get("gender"),
        "gender": format_gender(citizen.get("gender")),
        "height_cm": safe_get(citizen, "descriptors", "heightCM"),
        "height_category": get_height_category(safe_get(citizen, "descriptors", "heightCM")),
        "weight_kg": safe_get(citizen, "descriptors", "weightKG"),
        "shoe_size": safe_get(citizen, "descriptors", "shoeSize"),
        "blood": extract_blood_info(citizen),
        },

        "appearance": {
            "eye": extract_eye_info(citizen),
            "hair": extract_hair_info(citizen),
        },

        "home": format_home_address(citizen, address_lookup),

        "work": extract_work_info(job_data),

        "relations": {
            "partner_id": partner_id if isinstance(partner_id, int) and partner_id >= 0 else None,
            "partner_name": resolve_relation_name(partner_id, citizen_lookup),
            "paramour_id": paramour_id if isinstance(paramour_id, int) and paramour_id >= 0 else None,
            "paramour_name": resolve_relation_name(paramour_id, citizen_lookup),
        },

        "security": {
            "password": format_password(citizen.get("password")),
        },

        "extra": {
            "handwriting": citizen.get("handwriting"),
            "homeless": citizen.get("homeless"),
            "partner_raw": citizen.get("partner"),
            "paramour_raw": citizen.get("paramour"),
        },
    }


def parse_city_file(input_path: str) -> Dict[str, Any]:
    input_file = Path(input_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Файл не найден: {input_file}")

    with input_file.open("r", encoding="utf-8") as f:
        data = json.load(f)

    jobs = extract_jobs(data)
    address_lookup = build_address_lookup(data)
    citizens = data.get("citizens", [])
    citizen_lookup = build_citizen_lookup(citizens)

    cards: List[Dict[str, Any]] = []
    for citizen in citizens:
        try:
            cards.append(build_citizen_card(citizen, jobs, address_lookup, citizen_lookup))
        except Exception as e:
            print(f"[WARN] Не удалось обработать citizen humanID={citizen.get('humanID')}: {e}")

    cards.sort(key=lambda x: x.get("id") if x.get("id") is not None else 10**9)

    return {
        "meta": {
            "city_name": data.get("cityName"),
            "population": data.get("population"),
            "seed": data.get("seed"),
            "build": data.get("build"),
            "citizens_count": len(cards),
        },
        "citizens": cards,
    }


def main() -> None:
    result = parse_city_file(INPUT_FILE)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    meta = result.get("meta", {})

    print("Готово.")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"Citizens: {meta.get('citizens_count')}")


if __name__ == "__main__":
    main()