/**
 * Bangladesh administrative geography — 8 divisions, 64 districts.
 *
 * Coordinates are district-headquarters approximations (±5 km) used only for
 * distance ORDERING in Nearby Services. They are never presented as a precise
 * location, and the UI labels distances as approximate. Replace with surveyed
 * coordinates before any navigation feature ships.
 */

export const DIVISIONS = [
  'barishal',
  'chattogram',
  'dhaka',
  'khulna',
  'mymensingh',
  'rajshahi',
  'rangpur',
  'sylhet',
] as const;
export type Division = (typeof DIVISIONS)[number];

export const DIVISION_LABELS: Record<Division, { en: string; bn: string }> = {
  barishal: { en: 'Barishal', bn: 'বরিশাল' },
  chattogram: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  dhaka: { en: 'Dhaka', bn: 'ঢাকা' },
  khulna: { en: 'Khulna', bn: 'খুলনা' },
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী' },
  rangpur: { en: 'Rangpur', bn: 'রংপুর' },
  sylhet: { en: 'Sylhet', bn: 'সিলেট' },
};

export interface DistrictRecord {
  readonly code: string;
  readonly en: string;
  readonly bn: string;
  readonly division: Division;
  readonly lat: number;
  readonly lng: number;
}

export const DISTRICTS: readonly DistrictRecord[] = [
  // ------------------------------------------------------------ Barishal (6)
  { code: 'barguna', en: 'Barguna', bn: 'বরগুনা', division: 'barishal', lat: 22.1592, lng: 90.1265 },
  { code: 'barishal', en: 'Barishal', bn: 'বরিশাল', division: 'barishal', lat: 22.701, lng: 90.3535 },
  { code: 'bhola', en: 'Bhola', bn: 'ভোলা', division: 'barishal', lat: 22.6859, lng: 90.6482 },
  { code: 'jhalokati', en: 'Jhalokati', bn: 'ঝালকাঠি', division: 'barishal', lat: 22.6406, lng: 90.1987 },
  { code: 'patuakhali', en: 'Patuakhali', bn: 'পটুয়াখালী', division: 'barishal', lat: 22.3596, lng: 90.3299 },
  { code: 'pirojpur', en: 'Pirojpur', bn: 'পিরোজপুর', division: 'barishal', lat: 22.5841, lng: 89.972 },

  // -------------------------------------------------------- Chattogram (11)
  { code: 'bandarban', en: 'Bandarban', bn: 'বান্দরবান', division: 'chattogram', lat: 22.1953, lng: 92.2184 },
  { code: 'brahmanbaria', en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া', division: 'chattogram', lat: 23.9571, lng: 91.1115 },
  { code: 'chandpur', en: 'Chandpur', bn: 'চাঁদপুর', division: 'chattogram', lat: 23.2333, lng: 90.6712 },
  { code: 'chattogram', en: 'Chattogram', bn: 'চট্টগ্রাম', division: 'chattogram', lat: 22.3569, lng: 91.7832 },
  { code: 'coxs_bazar', en: "Cox's Bazar", bn: 'কক্সবাজার', division: 'chattogram', lat: 21.4272, lng: 92.0058 },
  { code: 'cumilla', en: 'Cumilla', bn: 'কুমিল্লা', division: 'chattogram', lat: 23.4607, lng: 91.1809 },
  { code: 'feni', en: 'Feni', bn: 'ফেনী', division: 'chattogram', lat: 23.0159, lng: 91.3976 },
  { code: 'khagrachhari', en: 'Khagrachhari', bn: 'খাগড়াছড়ি', division: 'chattogram', lat: 23.132, lng: 91.949 },
  { code: 'lakshmipur', en: 'Lakshmipur', bn: 'লক্ষ্মীপুর', division: 'chattogram', lat: 22.9447, lng: 90.8282 },
  { code: 'noakhali', en: 'Noakhali', bn: 'নোয়াখালী', division: 'chattogram', lat: 22.8696, lng: 91.0995 },
  { code: 'rangamati', en: 'Rangamati', bn: 'রাঙ্গামাটি', division: 'chattogram', lat: 22.6533, lng: 92.1829 },

  // ------------------------------------------------------------- Dhaka (13)
  { code: 'dhaka', en: 'Dhaka', bn: 'ঢাকা', division: 'dhaka', lat: 23.8103, lng: 90.4125 },
  { code: 'faridpur', en: 'Faridpur', bn: 'ফরিদপুর', division: 'dhaka', lat: 23.607, lng: 89.8429 },
  { code: 'gazipur', en: 'Gazipur', bn: 'গাজীপুর', division: 'dhaka', lat: 23.9999, lng: 90.4203 },
  { code: 'gopalganj', en: 'Gopalganj', bn: 'গোপালগঞ্জ', division: 'dhaka', lat: 23.0051, lng: 89.8266 },
  { code: 'kishoreganj', en: 'Kishoreganj', bn: 'কিশোরগঞ্জ', division: 'dhaka', lat: 24.4449, lng: 90.7766 },
  { code: 'madaripur', en: 'Madaripur', bn: 'মাদারীপুর', division: 'dhaka', lat: 23.164, lng: 90.1897 },
  { code: 'manikganj', en: 'Manikganj', bn: 'মানিকগঞ্জ', division: 'dhaka', lat: 23.8644, lng: 90.0047 },
  { code: 'munshiganj', en: 'Munshiganj', bn: 'মুন্সিগঞ্জ', division: 'dhaka', lat: 23.5422, lng: 90.5305 },
  { code: 'narayanganj', en: 'Narayanganj', bn: 'নারায়ণগঞ্জ', division: 'dhaka', lat: 23.6238, lng: 90.4999 },
  { code: 'narsingdi', en: 'Narsingdi', bn: 'নরসিংদী', division: 'dhaka', lat: 23.9322, lng: 90.7151 },
  { code: 'rajbari', en: 'Rajbari', bn: 'রাজবাড়ী', division: 'dhaka', lat: 23.7574, lng: 89.6445 },
  { code: 'shariatpur', en: 'Shariatpur', bn: 'শরীয়তপুর', division: 'dhaka', lat: 23.2423, lng: 90.4348 },
  { code: 'tangail', en: 'Tangail', bn: 'টাঙ্গাইল', division: 'dhaka', lat: 24.2513, lng: 89.9167 },

  // ------------------------------------------------------------ Khulna (10)
  { code: 'bagerhat', en: 'Bagerhat', bn: 'বাগেরহাট', division: 'khulna', lat: 22.6516, lng: 89.7859 },
  { code: 'chuadanga', en: 'Chuadanga', bn: 'চুয়াডাঙ্গা', division: 'khulna', lat: 23.6402, lng: 88.8418 },
  { code: 'jashore', en: 'Jashore', bn: 'যশোর', division: 'khulna', lat: 23.1664, lng: 89.2081 },
  { code: 'jhenaidah', en: 'Jhenaidah', bn: 'ঝিনাইদহ', division: 'khulna', lat: 23.5448, lng: 89.1539 },
  { code: 'khulna', en: 'Khulna', bn: 'খুলনা', division: 'khulna', lat: 22.8456, lng: 89.5403 },
  { code: 'kushtia', en: 'Kushtia', bn: 'কুষ্টিয়া', division: 'khulna', lat: 23.9013, lng: 89.1206 },
  { code: 'magura', en: 'Magura', bn: 'মাগুরা', division: 'khulna', lat: 23.4855, lng: 89.4198 },
  { code: 'meherpur', en: 'Meherpur', bn: 'মেহেরপুর', division: 'khulna', lat: 23.7622, lng: 88.6318 },
  { code: 'narail', en: 'Narail', bn: 'নড়াইল', division: 'khulna', lat: 23.1725, lng: 89.5124 },
  { code: 'satkhira', en: 'Satkhira', bn: 'সাতক্ষীরা', division: 'khulna', lat: 22.7185, lng: 89.0705 },

  // -------------------------------------------------------- Mymensingh (4)
  { code: 'jamalpur', en: 'Jamalpur', bn: 'জামালপুর', division: 'mymensingh', lat: 24.9375, lng: 89.9372 },
  { code: 'mymensingh', en: 'Mymensingh', bn: 'ময়মনসিংহ', division: 'mymensingh', lat: 24.7471, lng: 90.4203 },
  { code: 'netrokona', en: 'Netrokona', bn: 'নেত্রকোণা', division: 'mymensingh', lat: 24.8103, lng: 90.7279 },
  { code: 'sherpur', en: 'Sherpur', bn: 'শেরপুর', division: 'mymensingh', lat: 25.0205, lng: 90.0153 },

  // ---------------------------------------------------------- Rajshahi (8)
  { code: 'bogura', en: 'Bogura', bn: 'বগুড়া', division: 'rajshahi', lat: 24.8465, lng: 89.377 },
  { code: 'chapainawabganj', en: 'Chapainawabganj', bn: 'চাঁপাইনবাবগঞ্জ', division: 'rajshahi', lat: 24.5965, lng: 88.2775 },
  { code: 'joypurhat', en: 'Joypurhat', bn: 'জয়পুরহাট', division: 'rajshahi', lat: 25.0947, lng: 89.0227 },
  { code: 'naogaon', en: 'Naogaon', bn: 'নওগাঁ', division: 'rajshahi', lat: 24.7936, lng: 88.9318 },
  { code: 'natore', en: 'Natore', bn: 'নাটোর', division: 'rajshahi', lat: 24.4206, lng: 89.0003 },
  { code: 'pabna', en: 'Pabna', bn: 'পাবনা', division: 'rajshahi', lat: 24.0064, lng: 89.2372 },
  { code: 'rajshahi', en: 'Rajshahi', bn: 'রাজশাহী', division: 'rajshahi', lat: 24.3745, lng: 88.6042 },
  { code: 'sirajganj', en: 'Sirajganj', bn: 'সিরাজগঞ্জ', division: 'rajshahi', lat: 24.4534, lng: 89.7007 },

  // ----------------------------------------------------------- Rangpur (8)
  { code: 'dinajpur', en: 'Dinajpur', bn: 'দিনাজপুর', division: 'rangpur', lat: 25.6217, lng: 88.6354 },
  { code: 'gaibandha', en: 'Gaibandha', bn: 'গাইবান্ধা', division: 'rangpur', lat: 25.3288, lng: 89.5281 },
  { code: 'kurigram', en: 'Kurigram', bn: 'কুড়িগ্রাম', division: 'rangpur', lat: 25.8072, lng: 89.6295 },
  { code: 'lalmonirhat', en: 'Lalmonirhat', bn: 'লালমনিরহাট', division: 'rangpur', lat: 25.9923, lng: 89.2847 },
  { code: 'nilphamari', en: 'Nilphamari', bn: 'নীলফামারী', division: 'rangpur', lat: 25.9317, lng: 88.856 },
  { code: 'panchagarh', en: 'Panchagarh', bn: 'পঞ্চগড়', division: 'rangpur', lat: 26.3411, lng: 88.5542 },
  { code: 'rangpur', en: 'Rangpur', bn: 'রংপুর', division: 'rangpur', lat: 25.7439, lng: 89.2752 },
  { code: 'thakurgaon', en: 'Thakurgaon', bn: 'ঠাকুরগাঁও', division: 'rangpur', lat: 26.0337, lng: 88.4616 },

  // ------------------------------------------------------------ Sylhet (4)
  { code: 'habiganj', en: 'Habiganj', bn: 'হবিগঞ্জ', division: 'sylhet', lat: 24.3745, lng: 91.4155 },
  { code: 'moulvibazar', en: 'Moulvibazar', bn: 'মৌলভীবাজার', division: 'sylhet', lat: 24.4829, lng: 91.7774 },
  { code: 'sunamganj', en: 'Sunamganj', bn: 'সুনামগঞ্জ', division: 'sylhet', lat: 25.0658, lng: 91.395 },
  { code: 'sylhet', en: 'Sylhet', bn: 'সিলেট', division: 'sylhet', lat: 24.8949, lng: 91.8687 },
];

export const DISTRICT_CODES = DISTRICTS.map((d) => d.code);

const DISTRICT_BY_CODE = new Map(DISTRICTS.map((d) => [d.code, d]));

export function getDistrict(code: string | null | undefined): DistrictRecord | undefined {
  return code ? DISTRICT_BY_CODE.get(code) : undefined;
}

export function districtsInDivision(division: Division): readonly DistrictRecord[] {
  return DISTRICTS.filter((d) => d.division === division);
}

export function districtLabel(code: string | null | undefined, locale: 'bn' | 'en'): string {
  const d = getDistrict(code);
  if (!d) return '';
  return locale === 'bn' ? d.bn : d.en;
}

/**
 * Resolve a free-text district mention in Bangla, English, or Banglish.
 * Deliberately tolerant (BDS §1.1 law 5, "forgiveness over precision").
 */
export function matchDistrict(input: string): DistrictRecord | undefined {
  const raw = input.trim().toLowerCase();
  if (!raw) return undefined;
  const normalised = raw.replace(/[^a-zঀ-৿]/g, '');
  if (!normalised) return undefined;

  for (const d of DISTRICTS) {
    if (d.bn === input.trim()) return d;
    const en = d.en.toLowerCase().replace(/[^a-z]/g, '');
    if (en === normalised) return d;
    if (d.code.replace(/[^a-z]/g, '') === normalised) return d;
  }
  // Partial containment, longest match first, so "coxsbazar" beats "cox".
  const candidates = DISTRICTS.filter((d) => {
    const en = d.en.toLowerCase().replace(/[^a-z]/g, '');
    return (en.length >= 4 && normalised.includes(en)) || normalised.includes(d.bn);
  });
  return candidates.sort((a, b) => b.en.length - a.en.length)[0];
}

/** Great-circle distance in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
