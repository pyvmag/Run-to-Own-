import * as turf from '@turf/turf';
import * as h3 from 'h3-js';
import polyline from '@mapbox/polyline';

export const H3_RESOLUTION = 9;

/**
 * Decodes a Strava polyline into a list of [lat, lng] coordinates.
 */
export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  return polyline.decode(encoded);
}

/**
 * Calculates the Haversine distance between two coordinates in meters.
 */
export function haversine(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (start.lat * Math.PI) / 180;
  const phi2 = (end.lat * Math.PI) / 180;
  const dPhi = ((end.lat - start.lat) * Math.PI) / 180;
  const dLambda = ((end.lng - start.lng) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks if a path represents a closed loop (ends within 150 meters of its start).
 */
export function isClosedLoop(path: [number, number][]): boolean {
  if (path.length < 10) return false;
  const start = { lat: path[0][0], lng: path[0][1] };
  const end = { lat: path[path.length - 1][0], lng: path[path.length - 1][1] };
  return haversine(start, end) < 150.0;
}

/**
 * Interpolates coordinates along a path such that no sequential points are more than stepMeters apart.
 */
export function interpolatePath(path: [number, number][], stepMeters = 20.0): [number, number][] {
  const result: [number, number][] = [];
  if (path.length === 0) return result;
  
  result.push(path[0]);
  for (let i = 0; i < path.length - 1; i++) {
    const start = { lat: path[i][0], lng: path[i][1] };
    const end = { lat: path[i + 1][0], lng: path[i + 1][1] };
    const dist = haversine(start, end);

    if (dist > stepMeters) {
      const steps = Math.floor(dist / stepMeters);
      for (let j = 1; j <= steps; j++) {
        const fraction = j / (steps + 1);
        const lat = start.lat + (end.lat - start.lat) * fraction;
        const lng = start.lng + (end.lng - start.lng) * fraction;
        result.push([lat, lng]);
      }
    }
    result.push(path[i + 1]);
  }
  return result;
}

/**
 * Computes signed area of a coordinate ring to determine winding order.
 */
export function signedArea(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    area += ring[i][0] * ring[j][1];
    area -= ring[j][0] * ring[i][1];
  }
  return area / 2;
}

/**
 * Ensures the polygon's outer ring is wound counter-clockwise (essential for MapLibre/Mapbox GL).
 */
export function rewind(polygon: [number, number][][]): [number, number][][] {
  if (signedArea(polygon[0]) > 0) {
    polygon[0].reverse();
  }
  return polygon;
}

/**
 * Gets the H3 cell index for a single [lat, lng] point.
 */
export function getH3Cell(lat: number, lng: number, resolution = H3_RESOLUTION): string {
  return h3.latLngToCell(lat, lng, resolution);
}

/**
 * Calculates the exact distance of a run in meters that falls within a specific H3 cell index.
 * Relies on Turf.js for splitting lines and checking containment.
 */
export function calculateDistanceInTile(runLatLnds: [number, number][], h3Index: string): number {
  try {
    if (runLatLnds.length < 2) return 0;
    
    // Turf uses [longitude, latitude] coordinates
    const runCoords: [number, number][] = runLatLnds.map(c => [c[1], c[0]]);

    // Get cell boundary from h3-js which returns array of [lat, lng] coordinates
    const boundary = h3.cellToBoundary(h3Index);
    const boundaryLngLat = boundary.map(c => [c[1], c[0]]);
    boundaryLngLat.push(boundaryLngLat[0]); // close the polygon loop

    const hexagon = turf.polygon([boundaryLngLat]);
    const runLine = turf.lineString(runCoords);

    // If the entire run fits in one cell, skip segment calculations
    const startPt = turf.point(runCoords[0]);
    const endPt = turf.point(runCoords[runCoords.length - 1]);
    const startInside = turf.booleanPointInPolygon(startPt, hexagon);
    const endInside = turf.booleanPointInPolygon(endPt, hexagon);

    // Splitting runLine by the hexagon boundary
    const split = turf.lineSplit(runLine, hexagon);

    if (split.features.length === 0) {
      // The line does not intersect the boundary. It is either completely inside or completely outside.
      if (startInside) {
        return turf.length(runLine, { units: 'meters' });
      }
      return 0;
    }

    let totalLengthInMeters = 0;
    for (const segment of split.features) {
      const coords = segment.geometry.coordinates;
      // Get the midpoint of the segment to check if it's inside the cell
      const midPoint = turf.midpoint(
        turf.point(coords[0]),
        turf.point(coords[coords.length - 1])
      );
      if (turf.booleanPointInPolygon(midPoint, hexagon)) {
        totalLengthInMeters += turf.length(segment, { units: 'meters' });
      }
    }
    return totalLengthInMeters;
  } catch (e) {
    console.error(`Error calculating distance inside H3 tile ${h3Index}:`, e);
    return 0;
  }
}

/**
 * Processes a path of [lat, lng] points to get all unique H3 index cells intersected by the run.
 */
export function getH3IndexesForRun(interpolatedPath: [number, number][], isClosed: boolean): Set<string> {
  const h3Indexes = new Set<string>();

  // Add cell for each point along path
  for (const pt of interpolatedPath) {
    h3Indexes.add(h3.latLngToCell(pt[0], pt[1], H3_RESOLUTION));
  }

  // Draw H3 lines between consecutive points to ensure no cells are skipped
  for (let i = 0; i < interpolatedPath.length - 1; i++) {
    const startCell = h3.latLngToCell(interpolatedPath[i][0], interpolatedPath[i][1], H3_RESOLUTION);
    const endCell = h3.latLngToCell(interpolatedPath[i + 1][0], interpolatedPath[i + 1][1], H3_RESOLUTION);
    try {
      if (startCell !== endCell) {
        h3.gridPathCells(startCell, endCell).forEach(cell => h3Indexes.add(cell));
      }
    } catch (e) {
      // gridPathCells can fail if cells are extremely far apart or on poles
    }
  }

  // If path is a closed loop, polyfill the entire enclosed interior region
  if (isClosed && interpolatedPath.length >= 3) {
    try {
      // polygonToCells expects coordinates formatted as outer ring [lat, lng] array
      const boundary = interpolatedPath.map(pt => [pt[0], pt[1]]);
      boundary.push(boundary[0]); // close loop
      
      const polyCells = h3.polygonToCells(boundary, H3_RESOLUTION);
      polyCells.forEach(cell => h3Indexes.add(cell));
    } catch (e) {
      console.error("Could not polyfill closed loop:", e);
    }
  }

  return h3Indexes;
}
