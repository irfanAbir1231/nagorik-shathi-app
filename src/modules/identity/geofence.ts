import { db } from '@/lib/db/client';
import { unionBoundaries } from '@/lib/db/schema';
import type { UnionBoundary } from '@/lib/db/schema';

/**
 * Union/ward geofencing — Phase 1.
 *
 * A real boundary check, not the district-level approximation the rest of
 * Shebar Janala uses for "nearby" distance ordering (lib/domain/geography.ts).
 * This is the one requirement that structurally needs polygon precision, so
 * it gets its own small, dependency-free point-in-polygon test rather than
 * reusing the haversine-distance helper.
 */

/**
 * Standard ray-casting point-in-polygon test. Deterministic, no external
 * dependency — appropriate at the seed-corpus scale this ships with (a
 * handful of authored unions; see docs/DEVIATIONS.md). A production corpus of
 * thousands of real union boundaries would want a spatial index, the same way
 * `modules/places/overpass.ts` needed a grid cache once real volume existed.
 */
export function isPointInPolygon(
  point: { readonly lat: number; readonly lng: number },
  polygon: readonly (readonly [number, number])[],
): boolean {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]!;
    const [yj, xj] = polygon[j]!;
    const crossesRay = yi > y !== yj > y;
    if (crossesRay) {
      const xIntersect = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xIntersect) inside = !inside;
    }
  }
  return inside;
}

/** Every seeded union is checked — small corpus, no shortcuts taken. */
export async function findUnionForPoint(lat: number, lng: number): Promise<UnionBoundary | null> {
  const unions = await db.select().from(unionBoundaries);
  for (const union of unions) {
    if (isPointInPolygon({ lat, lng }, union.polygon)) return union;
  }
  return null;
}

export async function listUnions(): Promise<UnionBoundary[]> {
  return db.select().from(unionBoundaries).orderBy(unionBoundaries.name);
}
