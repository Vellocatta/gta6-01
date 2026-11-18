// The city of Solmar Bay: roads on a grid, districts, buildings, beach, marina water,
// parks and palms, plus the collision helpers the cars, cops and pedestrians all use.
// Generation is seeded, so the same seed always builds the same city.
import { CITY, DISTRICTS, ROAD_W } from './config.js';

export function createCity(random) {
  const roadsV = [360, 760, 1150, 1560, 1960, 2360, 2760, 3120];
  const roadsH = [300, 640, 980, 1320, 1660, 1980, 2280];
  const buildings = [];
  const trees = [];
  const parks = [];
  const boats = [];

  function roadAt(x, y) {
    for (const rx of roadsV) if (Math.abs(x - rx) < ROAD_W / 2 + 8) return true;
    for (const ry of roadsH) if (Math.abs(y - ry) < ROAD_W / 2 + 8) return true;
    return false;
  }
  function inWater(x, y) {
    // Marina basin on the west edge and the sea along the south beach.
    if (x < 150 && y > 520 && y < 1640) return true;
    if (y > 2380) return true;
    return false;
  }
  function districtAt(x, y) {
    for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    return DISTRICTS[0];
  }

  // Buildings fill the blocks between roads, never on a road or in the water.
  for (let bx = 0; bx < 9; bx += 1) {
    for (let by = 0; by < 8; by += 1) {
      const x0 = (bx === 0 ? 170 : roadsV[bx - 1] + ROAD_W / 2 + 14);
      const x1 = (bx >= roadsV.length ? CITY.width - 20 : roadsV[bx] - ROAD_W / 2 - 14);
      const y0 = (by === 0 ? 20 : roadsH[by - 1] + ROAD_W / 2 + 14);
      const y1 = (by >= roadsH.length ? 2360 : roadsH[by] - ROAD_W / 2 - 14);
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const d = districtAt((x0 + x1) / 2, (y0 + y1) / 2);
      if (d.kind === 'beach') continue;
      const count = d.kind === 'downtown' ? 2 : 3;
      for (let i = 0; i < count; i += 1) {
        const w = 90 + random() * 130;
        const h = 80 + random() * 120;
        const x = x0 + random() * Math.max(1, x1 - x0 - w);
        const y = y0 + random() * Math.max(1, y1 - y0 - h);
        if (inWater(x + w / 2, y + h / 2)) continue;
        buildings.push({
          x, y, w, h,
          kind: d.kind,
          tall: d.kind === 'downtown' && random() < 0.6,
          hue: Math.floor(random() * 360),
        });
      }
      // A park or a palm cluster in some blocks.
      if (random() < 0.3) {
        parks.push({ x: x0 + 10, y: y0 + 10, w: Math.min(180, x1 - x0 - 20), h: Math.min(140, y1 - y0 - 20) });
      }
      const palms = d.kind === 'beach' || d.kind === 'marina' ? 6 : 2;
      for (let i = 0; i < palms; i += 1) {
        trees.push({ x: x0 + random() * (x1 - x0), y: y0 + random() * (y1 - y0), palm: d.kind !== 'industrial' });
      }
    }
  }
  // Beach palms along the sand.
  for (let i = 0; i < 40; i += 1) trees.push({ x: 60 + random() * 3280, y: 2260 + random() * 110, palm: true });
  // Boats moored in the marina basin.
  for (let i = 0; i < 7; i += 1) boats.push({ x: 40 + random() * 80, y: 580 + i * 140 + random() * 40, angle: random() * 0.6 - 0.3 });

  const city = { width: CITY.width, height: CITY.height, roadsV, roadsH, buildings, trees, parks, boats };

  function collidesBuilding(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }
  function onRoad(x, y) { return roadAt(x, y); }
  function blocked(x, y, r) {
    if (x < r || y < r || x > CITY.width - r || y > CITY.height - r) return true;
    if (inWater(x, y)) return true;
    return collidesBuilding(x, y, r) !== null;
  }
  function nearestRoadPoint(x, y) {
    let best = null; let bestD = Infinity;
    for (const rx of roadsV) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; best = { x: rx, y }; } }
    for (const ry of roadsH) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; best = { x, y: ry }; } }
    return best;
  }
  function randomRoadPoint() {
    if (random() < 0.5) return { x: roadsV[Math.floor(random() * roadsV.length)], y: 100 + random() * 2200 };
    return { x: 200 + random() * 3000, y: roadsH[Math.floor(random() * roadsH.length)] };
  }
  function randomSidewalkPoint() {
    const p = randomRoadPoint();
    return { x: p.x + (random() - 0.5) * 130, y: p.y + (random() - 0.5) * 130 };
  }

  return { ...city, roadAt, inWater, districtAt, collidesBuilding, onRoad, blocked, nearestRoadPoint, randomRoadPoint, randomSidewalkPoint };
}
