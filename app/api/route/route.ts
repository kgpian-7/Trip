// POST /api/route
// Body: { originPlaceId: "lon,lat", destinationPlaceId: "lon,lat" }
// Driving route from OSRM. The map (TripMap) decodes a precision-5 encoded polyline.
// Response: { distanceKm, distanceMeters, durationSeconds, distanceText, durationText, encodedPolyline }

import { OSRM_URL, fetchJson, json, parseLonLat } from "../_lib/osm";

type OsrmRoute = { distance: number; duration: number; geometry: string };

function formatKm(km: number) {
  return `${km >= 100 ? Math.round(km).toLocaleString("en-IN") : km.toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    originPlaceId?: unknown;
    destinationPlaceId?: unknown;
  } | null;

  const origin = parseLonLat(body?.originPlaceId);
  const destination = parseLonLat(body?.destinationPlaceId);

  if (!origin || !destination) {
    return json({ error: "Choose a starting location and a destination from the suggestions." }, 400);
  }

  const url =
    `${OSRM_URL}/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}` +
    `?overview=full&geometries=polyline&steps=false&alternatives=false`;

  try {
    const data = await fetchJson<{ code?: string; routes?: OsrmRoute[] }>(url, {}, 20000);
    const route = data.routes?.[0];

    if (data.code !== "Ok" || !route) {
      return json({ error: "No driving route was found between these two places." }, 404);
    }

    const distanceKm = route.distance / 1000;
    return json({
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      distanceText: formatKm(distanceKm),
      durationText: formatDuration(route.duration),
      encodedPolyline: route.geometry,
    });
  } catch {
    return json({ error: "The routing service is temporarily unavailable. Please try again." }, 502);
  }
}
