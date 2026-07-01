"use client";

// Regions to look up availability in. The platform toggles use US JustWatch
// provider ids, which match many of these services in other English-speaking
// regions too; availability accuracy is best in the US and may under-match
// elsewhere. Add region-specific provider maps later for full coverage.
export const REGIONS: Array<{ code: string; name: string }> = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IN", name: "India" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
];

export function RegionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Region
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
