import { NextResponse } from "next/server";
import { fetchPlaceDetails } from "@/lib/google/places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id")?.trim();

  if (!placeId) {
    return NextResponse.json(
      { error: "place_id is required" },
      { status: 400 },
    );
  }

  try {
    const details = await fetchPlaceDetails(placeId);
    if (!details?.location) {
      return NextResponse.json(
        { error: "Could not resolve location" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      lat: details.location.latitude,
      lng: details.location.longitude,
      formatted_address: details.formattedAddress ?? null,
    });
  } catch (err) {
    console.error("Geocode lookup failed", err);
    return NextResponse.json(
      { error: "Geocode lookup failed" },
      { status: 500 },
    );
  }
}
