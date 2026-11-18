// Cars: the player's driveable rides, parked cars to steal, and the traffic that fills
// Solmar Bay's streets. Traffic follows the road grid and turns at intersections.
import { CAR, CAR_MODELS, CITY } from './config.js';

let nextId = 1;

export function makeCar(city, random, opts = {}) {
  const model = opts.model ?? CAR_MODELS[Math.floor(random() * CAR_MODELS.length)];
  const spot = opts.at ?? city.randomRoadPoint();
  return {
    id: nextId += 1,
    x: spot.x, y: spot.y,
    angle: opts.angle ?? (random() < 0.5 ? 0 : Math.PI / 2),
    speed: 0,
    model,
    color: opts.color ?? model.color,
    hp: CAR.hp,
    parked: opts.parked ?? false,
    isPolice: false,
    isTaxi: model.name === 'Taxi',
    driver: opts.parked ? null : 'traffic',
    targetRoad: null,
    turnCooldown: 0,
    honk: 0,
  };
}

export function makeParkedCars(city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const p = city.randomRoadPoint();
    const along = random() < 0.5;
    cars.push(makeCar(city, random, {
      at: { x: p.x + (along ? 0 : (random() < 0.5 ? -62 : 62)), y: p.y + (along ? (random() < 0.5 ? -62 : 62) : 0) },
      angle: along ? 0 : Math.PI / 2,
      parked: true,
    }));
  }
  return cars;
}

export function makeTraffic(city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) cars.push(makeCar(city, random, {}));
  return cars;
}

// Player driving: arcade handling — accelerate, brake/reverse, steer, skid on hard turns.
export function drivePlayerCar(car, input, dt) {
  const top = CAR.maxSpeed * car.model.speed;
  const steer = input.steer;
  if (input.up) car.speed += CAR.accel * dt;
  else if (input.down) car.speed -= CAR.brake * dt;
  else car.speed -= Math.sign(car.speed) * CAR.drag * 60 * dt;
  if (Math.abs(car.speed) < 4 && !input.up && !input.down) car.speed = 0;
  car.speed = Math.max(-top * 0.4, Math.min(top, car.speed));
  const grip = Math.min(1, Math.abs(car.speed) / 120 + 0.35);
  car.angle += steer * CAR.turn * grip * dt * Math.sign(car.speed || 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(20, Math.min(CITY.width - 20, car.x));
  car.y = Math.max(20, Math.min(CITY.height - 20, car.y));
  return Math.abs(car.speed) > 240 && Math.abs(steer) > 0.5;
}

// Traffic AI: cruise along its road, slow for the car ahead, turn at intersections.
export function updateTraffic(car, city, random, cars, dt) {
  if (car.parked || car.isPolice) return;
  const target = 130 + random() * 0; // steady cruise
  car.speed += (target - car.speed) * dt * 0.8;
  // Slow down if another car is close ahead.
  const ax = car.x + Math.cos(car.angle) * 70;
  const ay = car.y + Math.sin(car.angle) * 70;
  for (const other of cars) {
    if (other === car) continue;
    const dx = other.x - ax; const dy = other.y - ay;
    if (dx * dx + dy * dy < 70 * 70) { car.speed = Math.max(0, car.speed - 260 * dt); break; }
  }
  car.turnCooldown -= dt;
  const nearV = city.roadsV.find((rx) => Math.abs(car.x - rx) < 14);
  const nearH = city.roadsH.find((ry) => Math.abs(car.y - ry) < 14);
  if (car.turnCooldown <= 0 && nearV !== undefined && nearH !== undefined && random() < 0.02) {
    // At an intersection: sometimes turn onto the crossing road.
    car.angle = random() < 0.5 ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    car.turnCooldown = 4;
  }
  // Gentle steering back onto the road centre.
  const road = city.nearestRoadPoint(car.x, car.y);
  const dx = road.x - car.x; const dy = road.y - car.y;
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-1.4 * dt, Math.min(1.4 * dt, diff * 2 * dt));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (car.x < 20 || car.x > CITY.width - 20 || car.y < 20 || car.y > CITY.height - 20) {
    const p = city.randomRoadPoint();
    car.x = p.x; car.y = p.y; car.speed = 100;
  }
}

export function carsCollide(a, b) {
  const dx = a.x - b.x; const dy = a.y - b.y;
  const r = (a.model.w + b.model.w) / 2 - 6;
  return dx * dx + dy * dy < r * r;
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null; let bestD = maxDist * maxDist;
  for (const car of cars) {
    const dx = car.x - x; const dy = car.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
