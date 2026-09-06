import "server-only";
import { randomUUID } from "crypto";
import { DEV_BYPASS_ENABLED } from "@/lib/auth";

/**
 * In-memory Supabase stand-in for local dev when no real project is configured.
 *
 * When NEXT_PUBLIC_SUPABASE_URL / anon key are absent (outside production), the
 * server `createClient()` returns this instead of throwing, so the whole app is
 * browseable with seeded sample data and no external backend. It implements only
 * the query surface this codebase actually uses:
 *   .from(t).select/insert/update/upsert/delete + .eq/.neq/.in/.is/.order
 *   + .single()/.maybeSingle(), await (thenable), and .select("*",{count,head}).
 * It is NOT a general Postgres emulator — no RLS, joins, or SQL semantics.
 */

const DEV_USER_ID =
  process.env.DEV_BYPASS_USER_ID || "00000000-0000-0000-0000-000000000000";
const DEV_USER_EMAIL = "dev@local.test";

type Row = Record<string, unknown>;

interface Interest {
  id: string;
  slug: string;
  label: string;
  category: string;
  search_keywords: string[];
}

// Curated slice of the real taxonomy (db/seed/interests.sql + migrations),
// enough for every category group to render in the picker. Stable ids so the
// seeded profile can reference them.
const INTERESTS: Interest[] = [
  // food
  ["thai-food", "Thai food", "food"],
  ["sushi", "Sushi", "food"],
  ["bbq", "BBQ", "food"],
  ["pizza", "Pizza", "food"],
  ["brunch", "Brunch", "food"],
  ["ice-cream", "Ice cream", "food"],
  // drinks
  ["specialty-coffee", "Specialty coffee", "drinks"],
  ["craft-brewery", "Craft brewery", "drinks"],
  ["winery", "Winery", "drinks"],
  ["cocktail-bar", "Cocktail bar", "drinks"],
  // nightlife
  ["dive-bars", "Dive bars", "nightlife"],
  ["speakeasies", "Speakeasies", "nightlife"],
  ["live-music", "Live music", "nightlife"],
  ["karaoke", "Karaoke", "nightlife"],
  // shopping
  ["record-stores", "Record stores", "shopping"],
  ["bookstores", "Bookstores", "shopping"],
  ["thrift-vintage", "Thrift / vintage", "shopping"],
  ["farmers-markets", "Farmers markets", "shopping"],
  // outdoor
  ["hiking-trails", "Hiking trails", "outdoor"],
  ["state-parks", "State parks", "outdoor"],
  ["waterfalls", "Waterfalls", "outdoor"],
  ["scenic-overlooks", "Scenic overlooks", "outdoor"],
  // fitness
  ["yoga-studios", "Yoga studios", "fitness"],
  ["climbing-gyms", "Climbing gyms", "fitness"],
  // activities
  ["mini-golf", "Mini golf", "activities"],
  ["arcades", "Arcades", "activities"],
  ["escape-rooms", "Escape rooms", "activities"],
  ["hot-springs", "Hot springs", "activities"],
  // culture
  ["art-museums", "Art museums", "culture"],
  ["history-museums", "History museums", "culture"],
  ["historic-sites", "Historic landmarks", "culture"],
  ["street-art", "Murals / street art", "culture"],
  // animals
  ["aquariums", "Aquariums", "animals"],
  ["zoos", "Zoos", "animals"],
  // quirky
  ["roadside", "Roadside attractions", "quirky"],
  ["weird-museums", "Quirky museums", "quirky"],
  ["photo-spots", "Photo spots", "quirky"],
].map(([slug, label, category]) => ({
  id: `int-${slug}`,
  slug,
  label,
  category,
  search_keywords: [label.toLowerCase()],
}));

const SEED_TRIP_ID = "11111111-1111-1111-1111-111111111111";

// The dev profile's own interests — >= 5 so trip creation is unlocked.
const SEED_PROFILE_INTEREST_SLUGS = [
  "specialty-coffee",
  "record-stores",
  "hiking-trails",
  "bbq",
  "art-museums",
  "roadside",
];

function seededMatch(
  slug: string,
  name: string,
  address: string,
  lat: number,
  lng: number,
  detourSeconds: number,
  rating: number,
  reviews: number,
  reasoning: string,
  score: number,
): Row {
  return {
    trip_id: SEED_TRIP_ID,
    google_place_id: `demo-${slug}-${name.toLowerCase().replace(/\W+/g, "-")}`,
    name,
    formatted_address: address,
    lat,
    lng,
    detour_seconds: detourSeconds,
    rating,
    review_count: reviews,
    matched_interests: [slug],
    shared_tags_count: 1,
    primary_photo_id: null,
    editorial_reasoning: reasoning,
    editorial_score: score,
  };
}

interface Store {
  interests: Row[];
  profiles: Row[];
  profile_interests: Row[];
  trips: Row[];
  trip_matches: Row[];
  place_details_cache: Row[];
}

// Module-level singleton so writes persist across requests within one dev
// server process (resets on restart — it's in-memory only).
const g = globalThis as unknown as { __mockStore?: Store };

function buildStore(): Store {
  const slugToId = new Map(INTERESTS.map((i) => [i.slug, i.id]));
  return {
    interests: INTERESTS.map((i) => ({ ...i })),
    profiles: [
      {
        id: DEV_USER_ID,
        display_name: "Alex (dev)",
        avatar_url: null,
        locals_only: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    profile_interests: SEED_PROFILE_INTEREST_SLUGS.map((slug) => ({
      profile_id: DEV_USER_ID,
      interest_id: slugToId.get(slug),
    })),
    trips: [
      {
        id: SEED_TRIP_ID,
        creator_id: DEV_USER_ID,
        guest_id: null,
        name: "SF → LA weekend",
        origin_address: "San Francisco, CA, USA",
        origin_lat: 37.7749,
        origin_lng: -122.4194,
        origin_place_id: null,
        dest_address: "Los Angeles, CA, USA",
        dest_lat: 34.0522,
        dest_lng: -118.2437,
        dest_place_id: null,
        corridor_miles: 10,
        status: "active",
        trip_type: "road_trip",
        invite_token: "demo-invite-token",
        matches_computed_at: new Date(Date.now() - 3600_000).toISOString(),
        matches_combined: false,
        route_polyline: null,
        created_at: new Date(Date.now() - 7200_000).toISOString(),
      },
    ],
    trip_matches: [
      seededMatch(
        "specialty-coffee",
        "Big Sur Roasters",
        "Carmel-by-the-Sea, CA",
        36.5552,
        -121.9233,
        420,
        4.7,
        812,
        "A coast-road institution — single-origin pour-overs and cliffside seating.",
        0.92,
      ),
      seededMatch(
        "roadside",
        "Madonna Inn",
        "San Luis Obispo, CA",
        35.2519,
        -120.6805,
        180,
        4.5,
        5400,
        "Gloriously kitschy landmark; the pink dining room is worth the stop alone.",
        0.88,
      ),
      seededMatch(
        "hiking-trails",
        "Bishop Peak Trail",
        "San Luis Obispo, CA",
        35.2907,
        -120.6912,
        900,
        4.8,
        2100,
        "Short but steep summit hike with a full-valley payoff at the top.",
        0.81,
      ),
      seededMatch(
        "bbq",
        "Firestone Grill",
        "San Luis Obispo, CA",
        35.2733,
        -120.6641,
        240,
        4.6,
        6900,
        "Tri-tip sandwich country — the line moves fast and it's worth it.",
        0.79,
      ),
      seededMatch(
        "art-museums",
        "MOXI",
        "Santa Barbara, CA",
        34.4139,
        -119.6906,
        300,
        4.6,
        1500,
        "Hands-on science + art; a good leg-stretch break with a rooftop view.",
        0.74,
      ),
    ],
    place_details_cache: [],
  };
}

function store(): Store {
  if (!g.__mockStore) g.__mockStore = buildStore();
  return g.__mockStore;
}

type Op = "select" | "insert" | "update" | "upsert" | "delete";
interface Filter {
  op: "eq" | "neq" | "in" | "is";
  col: string;
  val: unknown;
}
interface OrderSpec {
  col: string;
  ascending: boolean;
}

interface Result<T> {
  data: T;
  error: null | { message: string };
  count: number | null;
}

class MockQueryBuilder implements PromiseLike<Result<Row[]>> {
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private op: Op = "select";
  private payload: Row[] = [];
  private conflictKey = "id";
  private wantCount = false;
  private headOnly = false;

  constructor(private table: keyof Store) {}

  private rows(): Row[] {
    return store()[this.table];
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(row: Row) {
    this.op = "update";
    this.payload = [row];
    return this;
  }

  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    if (opts?.onConflict) this.conflictKey = opts.onConflict;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ op: "eq", col, val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push({ op: "neq", col, val });
    return this;
  }
  in(col: string, val: unknown[]) {
    this.filters.push({ op: "in", col, val });
    return this;
  }
  is(col: string, val: unknown) {
    this.filters.push({ op: "is", col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending !== false });
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      const v = row[f.col];
      switch (f.op) {
        case "eq":
          return v === f.val;
        case "neq":
          return v !== f.val;
        case "is":
          return v === f.val;
        case "in":
          return Array.isArray(f.val) && f.val.includes(v);
      }
    });
  }

  private applyOrder(rows: Row[]): Row[] {
    if (this.orders.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const { col, ascending } of this.orders) {
        const av = a[col];
        const bv = b[col];
        if (av === bv) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av < bv ? -1 : 1;
        return ascending ? cmp : -cmp;
      }
      return 0;
    });
  }

  private execute(): Result<Row[]> {
    const all = this.rows();
    if (this.op === "select") {
      const matched = this.applyOrder(all.filter((r) => this.matches(r)));
      if (this.headOnly) return { data: [], error: null, count: matched.length };
      return {
        data: matched,
        error: null,
        count: this.wantCount ? matched.length : null,
      };
    }

    if (this.op === "insert") {
      const inserted = this.payload.map((r) => this.withId({ ...r }));
      all.push(...inserted);
      return { data: inserted, error: null, count: null };
    }

    if (this.op === "upsert") {
      const affected: Row[] = [];
      for (const r of this.payload) {
        const key = this.conflictKey;
        const idx = all.findIndex((x) => x[key] === r[key]);
        if (idx >= 0) {
          all[idx] = { ...all[idx], ...r };
          affected.push(all[idx]);
        } else {
          const row = this.withId({ ...r });
          all.push(row);
          affected.push(row);
        }
      }
      return { data: affected, error: null, count: null };
    }

    if (this.op === "update") {
      const affected: Row[] = [];
      for (const row of all) {
        if (this.matches(row)) {
          Object.assign(row, this.payload[0]);
          affected.push(row);
        }
      }
      return { data: affected, error: null, count: null };
    }

    // delete
    const kept: Row[] = [];
    const removed: Row[] = [];
    for (const row of all) (this.matches(row) ? removed : kept).push(row);
    store()[this.table] = kept;
    return { data: removed, error: null, count: null };
  }

  private withId(r: Row): Row {
    if (this.table !== "profile_interests" && r.id == null) r.id = randomUUID();
    return r;
  }

  async single(): Promise<Result<Row | null>> {
    const res = this.execute();
    return { data: res.data[0] ?? null, error: null, count: res.count };
  }

  async maybeSingle(): Promise<Result<Row | null>> {
    const res = this.execute();
    return { data: res.data[0] ?? null, error: null, count: res.count };
  }

  then<TResult1 = Result<Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

const DEV_USER = {
  id: DEV_USER_ID,
  email: DEV_USER_EMAIL,
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date(0).toISOString(),
};

const mockAuth = {
  async getUser() {
    return { data: { user: DEV_USER }, error: null };
  },
  async getSession() {
    return { data: { session: null }, error: null };
  },
  async signInWithPassword() {
    return { data: { user: DEV_USER, session: null }, error: null };
  },
  async signUp() {
    return { data: { user: DEV_USER, session: null }, error: null };
  },
  async signInAnonymously() {
    return { data: { user: DEV_USER, session: null }, error: null };
  },
  async signOut() {
    return { error: null };
  },
  async exchangeCodeForSession() {
    return { data: { session: null }, error: null };
  },
  async verifyOtp() {
    return { data: { session: null }, error: null };
  },
};

export function isMockMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function createMockClient() {
  // Log once so it's obvious in the dev console why data is fake.
  if (!g.__mockStore) {
    store();
    const authNote = DEV_BYPASS_ENABLED ? "" : " (tip: set DEV_BYPASS_AUTH=true)";
    console.warn(
      `[supabase] No project configured — using in-memory mock with seeded data${authNote}.`,
    );
  }
  return {
    auth: mockAuth,
    from(table: string) {
      return new MockQueryBuilder(table as keyof Store);
    },
  };
}
