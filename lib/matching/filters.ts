import "server-only";
import type { PlaceDetails } from "@/lib/google/places";

/**
 * Normalized names of known chains. We match against the lowercase,
 * alphanumeric-only version of the place name. Add new chains here
 * as they show up in results.
 */
const CHAIN_NAMES = new Set([
  // Grocery / convenience
  "safeway", "walmart", "target", "costco", "kroger", "aldis", "aldi",
  "traderjoes", "traderjoess", "wholefoods", "wholefoodsmarket",
  "publix", "foodlion", "giantfood", "giant", "harristeeter",
  "wegmans", "heb", "winndixie", "dollargeneral", "dollartree",
  "familydollar", "7eleven", "711", "wawa", "sheetz", "circlek",
  // Fast food
  "mcdonalds", "burgerking", "wendys", "tacobell", "chickfila",
  "chickfil", "popeyes", "arbys", "jackinthebox", "sonicdriveins",
  "sonicdrivein", "sonic", "fiveguys", "innout", "innoutburger",
  "whataburger", "hardees", "carlsjr", "dairyqueen", "dq",
  "panerabread", "panera", "chipotle", "chipotlemexicangrill",
  "jimmyjohns", "jerseymikes", "jerseymikessubs", "subway",
  "firehousesubs", "potbelly", "quiznos", "bostonmarket",
  "papajohns", "dominos", "dominospizza", "pizzahut", "littlecaesars",
  "kfc", "longsilvers", "longjohnsilvers", "zaxbys",
  "raisingcanes", "cookout", "culvers", "shakeshack",
  "pandaexpress", "wingstop", "buffalowildwings", "bww", "hooters",
  "goldenCorral", "goldencorral", "crackerbarrel",
  // Coffee / bakery chains
  "starbucks", "dunkin", "dunkindonuts", "timhortons",
  "cariboucoffee", "peets", "peetscoffee", "dutchbros",
  // Sit-down chains
  "applebees", "chilis", "olivegarden", "redlobster", "tgifridays",
  "outbacksteakhouse", "outback", "texasroadhouse", "bobevans",
  "dennys", "ihop", "wafflehouse", "perkins", "friendlys",
  "rubytuesday", "longhornsteakhouse", "logansroadhouse",
  "redrobin", "buffalowildwings", "bjs", "bjsrestaurant",
  "cheesecakefactory", "thecheesecakefactory",
  "cheddarsscratchkitchen", "cracklebarrel",
  // Retail / pharmacy
  "cvs", "walgreens", "riteaid", "bestbuy", "homedepot",
  "lowes", "tjmaxx", "marshalls", "ross", "oldnavy", "gap",
  "bathbodyworks", "victoriassecret", "macys", "kohls",
  "burlingtoncoatfactory", "burlington",
  // Hotels
  "marriott", "hilton", "holidayinn", "hamptoninn", "bestwestern",
  "comfortinn", "daysinn", "motel6", "super8", "laQuinta",
  // Gas stations
  "shell", "exxon", "bp", "chevron", "sunoco", "valero",
  "speedway", "racetrac", "quiktrip", "loves", "pilotflyingj",
  "pilot", "flyingj",
  // Other chains
  "ripleysbelieveitornot", "ripleys", "madametussauds",
  "planetfitness", "lafitness", "24hourfitness", "goldsgym",
  "orangetheory", "orangetheoryfitness",
]);

/** Normalize a name for chain matching: lowercase, strip non-alphanumeric. */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Returns true if the place name matches a known chain. */
export function isKnownChain(name: string): boolean {
  const norm = normalizeName(name);
  // Exact match
  if (CHAIN_NAMES.has(norm)) return true;
  // Check if any chain name is a prefix or the full normalized name starts with it
  for (const chain of CHAIN_NAMES) {
    if (norm.startsWith(chain) || norm.endsWith(chain)) return true;
  }
  return false;
}

/**
 * Returns true if the place has opening-hours data AND is marked as
 * currently closed. Places without hours data (parks, landmarks, etc.)
 * pass through — we only filter places that explicitly say "closed now."
 */
export function isClosedNow(details: PlaceDetails): boolean {
  const hours = details.regularOpeningHours;
  if (!hours || hours.openNow === undefined) return false; // No data — let it through
  return hours.openNow === false;
}
