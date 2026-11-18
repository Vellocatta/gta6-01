// Pedestrians: Solmar Bay's residents strolling the sidewalks, crossing streets, waiting
// at the marina and the beach. They flee gunfire and run from speeding cars.
import { CITY } from './config.js';

const NAMES = ['Mara', 'Tomas', 'Luz', 'Diego', 'Carmen', 'Rafa', 'Nina', 'Paco', 'Sofia', 'Leo', 'Iris', 'Hugo'];
const SHIRTS = ['#e07a5f', '#81b29a', '#f2cc8f', '#6d9dc5', '#c08497', '#f4a261', '#a7c957', '#e9c46a'];

export function makePedestrians(city, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const p = city.randomSidewalkPoint();
    peds.push({
      x: p.x, y: p.y,
      angle: random() * Math.PI * 2,
      speed: 34 + random() * 30,
      name: NAMES[i % NAMES.length],
      shirt: SHIRTS[Math.floor(random() * SHIRTS.length)],
      state: 'walk',
      panic: 0,
      target: null,
      retarget: 0,
      fare: random() < 0.25,
    });
  }
  return peds;
}

export function updatePedestrians(peds, city, danger, dt) {
  for (const ped of peds) {
    ped.retarget -= dt;
    if (ped.panic > 0) {
      ped.panic -= dt;
      ped.state = 'flee';
      ped.x += Math.cos(ped.angle) * 150 * dt;
      ped.y += Math.sin(ped.angle) * 150 * dt;
      if (ped.panic <= 0) ped.state = 'walk';
    } else if (ped.state === 'walk') {
      if (ped.retarget <= 0 || !ped.target) {
        const p = city.randomSidewalkPoint();
        ped.target = p;
        ped.retarget = 6 + Math.random() * 6;
      }
      const dx = ped.target.x - ped.x; const dy = ped.target.y - ped.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) { ped.target = null; continue; }
      ped.angle = Math.atan2(dy, dx);
      ped.x += (dx / d) * ped.speed * dt;
      ped.y += (dy / d) * ped.speed * dt;
    }
    // Keep peds out of buildings and water.
    if (city.blocked(ped.x, ped.y, 10)) {
      ped.x -= Math.cos(ped.angle) * 60 * dt;
      ped.y -= Math.sin(ped.angle) * 60 * dt;
      ped.target = null;
    }
    ped.x = Math.max(16, Math.min(CITY.width - 16, ped.x));
    ped.y = Math.max(16, Math.min(CITY.height - 16, ped.y));
  }
  // Gunfire or a near miss scares everyone nearby.
  if (danger) {
    for (const ped of peds) {
      const dx = ped.x - danger.x; const dy = ped.y - danger.y;
      if (dx * dx + dy * dy < 260 * 260) {
        ped.panic = 2.5;
        ped.angle = Math.atan2(dy, dx);
      }
    }
  }
}
