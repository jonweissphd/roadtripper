import { NextResponse } from "next/server";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!SERVER_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_SERVER_KEY is not set" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": SERVER_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: [
            "locality",
            "postal_code",
            "street_address",
            "airport",
            "neighborhood",
          ],
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Places autocomplete error", response.status, text);
      return NextResponse.json({ predictions: [] });
    }

    const data = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          text: { text: string };
          structuredFormat?: {
            mainText?: { text: string };
            secondaryText?: { text: string };
          };
        };
      }>;
    };

    const predictions = (data.suggestions ?? [])
      .filter((s) => s.placePrediction)
      .map((s) => ({
        place_id: s.placePrediction!.placeId,
        description: s.placePrediction!.text.text,
        main_text:
          s.placePrediction!.structuredFormat?.mainText?.text ?? "",
        secondary_text:
          s.placePrediction!.structuredFormat?.secondaryText?.text ?? "",
      }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("Places autocomplete threw", err);
    return NextResponse.json({ predictions: [] });
  }
}
