"use client";

import { useCallback, useMemo, useState } from "react";
import { decodePolyline } from "@/lib/google/polyline";
import { LaunchBar } from "./LaunchBar";
import { MatchList, type MatchRow } from "./MatchList";
import { TripMap, type MapMatch, type MapPoint } from "./TripMap";

export function TripContent({
  tripId,
  origin,
  destination,
  originAddress,
  destAddress,
  encodedPolyline,
  matches,
  interestLabels,
  isExplore = false,
}: {
  tripId: string;
  origin: MapPoint;
  destination: MapPoint;
  originAddress: string;
  destAddress: string;
  encodedPolyline: string | null;
  matches: MatchRow[];
  interestLabels: Record<string, string>;
  isExplore?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggleChecked = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const polylinePath = useMemo<MapPoint[]>(
    () => (encodedPolyline ? decodePolyline(encodedPolyline) : []),
    [encodedPolyline],
  );

  const mapMatches = useMemo<MapMatch[]>(
    () =>
      matches.map((m) => ({
        google_place_id: m.google_place_id,
        name: m.name,
        lat: m.lat,
        lng: m.lng,
      })),
    [matches],
  );

  const checkedMatches = useMemo(
    () => matches.filter((m) => checkedIds.has(m.google_place_id)),
    [matches, checkedIds],
  );

  return (
    <div className="space-y-8">
      <TripMap
        origin={origin}
        destination={destination}
        polylinePath={polylinePath}
        matches={mapMatches}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <MatchList
        tripId={tripId}
        matches={matches}
        interestLabels={interestLabels}
        selectedId={selectedId}
        onHover={setSelectedId}
        checkedIds={checkedIds}
        onToggle={toggleChecked}
        isExplore={isExplore}
      />
      {checkedMatches.length > 0 && (
        <LaunchBar
          origin={origin}
          destination={destination}
          originAddress={originAddress}
          destAddress={destAddress}
          waypoints={checkedMatches}
          isExplore={isExplore}
        />
      )}
    </div>
  );
}
