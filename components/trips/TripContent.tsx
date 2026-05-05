"use client";

import { useMemo, useState } from "react";
import { decodePolyline } from "@/lib/google/polyline";
import { MatchList, type MatchRow } from "./MatchList";
import { TripMap, type MapMatch, type MapPoint } from "./TripMap";

export function TripContent({
  tripId,
  origin,
  destination,
  encodedPolyline,
  matches,
  interestLabels,
}: {
  tripId: string;
  origin: MapPoint;
  destination: MapPoint;
  encodedPolyline: string | null;
  matches: MatchRow[];
  interestLabels: Record<string, string>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      />
    </div>
  );
}
