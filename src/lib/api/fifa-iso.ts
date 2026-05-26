// FIFA 3-letter code -> ISO 3166-1 alpha-2 country code.
// Used to build correct flag emojis from football-data.org TLA codes.
export const FIFA_TO_ISO2: Record<string, string> = {
  MEX: "MX", RSA: "ZA", KOR: "KR", CZE: "CZ", CAN: "CA", BIH: "BA",
  USA: "US", PAR: "PY", QAT: "QA", SUI: "CH", BRA: "BR", MAR: "MA",
  HAI: "HT", AUS: "AU", TUR: "TR", GER: "DE", CUW: "CW", NED: "NL",
  JPN: "JP", CIV: "CI", ECU: "EC", SWE: "SE", TUN: "TN", ESP: "ES",
  CPV: "CV", BEL: "BE", EGY: "EG", KSA: "SA", URY: "UY", IRN: "IR",
  NZL: "NZ", FRA: "FR", SEN: "SN", IRQ: "IQ", NOR: "NO", ARG: "AR",
  ALG: "DZ", AUT: "AT", JOR: "JO", POR: "PT", COD: "CD", CRO: "HR",
  GHA: "GH", PAN: "PA", UZB: "UZ", COL: "CO", ITA: "IT", DEN: "DK",
  POL: "PL", UKR: "UA", WAL: "GB-WLS", NIR: "GB-NIR", IRL: "IE",
  CHI: "CL", PER: "PE", VEN: "VE", BOL: "BO", URU: "UY", CRC: "CR",
  HON: "HN", JAM: "JM", TRI: "TT", SLV: "SV", GUA: "GT", NCA: "NI",
  CHN: "CN", IND: "IN", THA: "TH", VIE: "VN", MAS: "MY", SIN: "SG",
  PHI: "PH", IDN: "ID", UAE: "AE", BHR: "BH", KUW: "KW", OMA: "OM",
  LBN: "LB", SYR: "SY", YEM: "YE", PLE: "PS", ISR: "IL", TPE: "TW",
  HKG: "HK", PRK: "KP", NGA: "NG", CMR: "CM", ALG2: "DZ", TUN2: "TN",
  ANG: "AO", MOZ: "MZ", ZIM: "ZW", ZAM: "ZM", BFA: "BF", MLI: "ML",
  GAB: "GA", CGO: "CG", GUI: "GN", TOG: "TG", BEN: "BJ", ETH: "ET",
  KEN: "KE", UGA: "UG", TAN: "TZ", SUD: "SD", LBY: "LY", MTN: "MR",
  GAM: "GM", SLE: "SL", LBR: "LR", NIG: "NE", CTA: "CF", SOM: "SO",
  RWA: "RW", BDI: "BI", MAD: "MG", MWI: "MW", BOT: "BW", NAM: "NA",
  LES: "LS", SWZ: "SZ", COM: "KM", DJI: "DJ", ERI: "ER", STP: "ST",
  EQG: "GQ", ROU: "RO", BUL: "BG", SRB: "RS", MNE: "ME", MKD: "MK",
  ALB: "AL", SVK: "SK", SVN: "SI", HUN: "HU", GRE: "GR", CYP: "CY",
  MLT: "MT", LUX: "LU", ISL: "IS", FIN: "FI", EST: "EE", LVA: "LV",
  LTU: "LT", BLR: "BY", MDA: "MD", GEO: "GE", ARM: "AM", AZE: "AZ",
  KAZ: "KZ", KGZ: "KG", TJK: "TJ", TKM: "TM", AFG: "AF", PAK: "PK",
  BAN: "BD", NEP: "NP", SRI: "LK", MDV: "MV", BHU: "BT", MGL: "MN",
  LAO: "LA", CAM: "KH", MYA: "MM", BRU: "BN", PNG: "PG", FIJ: "FJ",
  NCL: "NC", TAH: "PF", SOL: "SB", VAN: "VU",
};

export function flagFromFifaOrTla(code?: string | null): string | undefined {
  if (!code) return undefined;
  const up = code.toUpperCase();
  if (up === "ENG") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (up === "SCO") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  if (up === "WAL") return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  if (up === "NIR") return "🇬🇧";
  const iso2 = FIFA_TO_ISO2[up] ?? (up.length === 2 ? up : undefined);
  if (!iso2 || iso2.length !== 2) return undefined;
  const A = 0x41, base = 0x1f1e6;
  const cps = [...iso2].map((c) => base + (c.charCodeAt(0) - A));
  if (cps.some((cp) => cp < base || cp > base + 25)) return undefined;
  return String.fromCodePoint(...cps);
}
