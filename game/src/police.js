// The wanted system and the Solmar Bay Police Department. Crime raises stars; stars
// bring patrol cars that ram the player and officers on foot who try to bust them.
// Lay low and the heat fades; get caught on foot and it is over.
import { CAR_MODELS, CITY, POLICE_COLOR, WANTED_MAX } from './config.js';
import { makeCar } from './vehicles.js';

export function addWanted(state, amount, reason) {
  state.player.wanted = Math.max(0, Math.min(WANTED_MAX, state.player.wanted + amount));
  if (amount > 0) state.banner = { text: reason, color: '#e5534b', t: 2.2 };
}

export function wantedPoliceCount(wanted) {
  return [0, 1, 2, 3, 4, 6][wanted] ?? 0;
}

export function updatePolice(state, city, random, dt) {
  const p = state.player;
  // Heat fades when the player stays out of trouble and out of sight.
  state.heatTimer -= dt;
  if (state.heatTimer <= 0) {
    state.heatTimer = 9;
    if (p.wanted > 0 && state.police.length === 0) p.wanted = Math.max(0, p.wanted - 1);
  }
  // Spawn patrol cars up to the wanted level's quota.
  const want = wantedPoliceCount(p.wanted);
  while (state.police.length < want) {
    const angle = random() * Math.PI * 2;
    const dist = 500 + random() * 300;
    const car = makeCar(city, random, {
      at: { x: Math.max(40, Math.min(CITY.width - 40, p.x + Math.cos(angle) * dist)), y: Math.max(40, Math.min(CITY.height - 40, p.y + Math.sin(angle) * dist)) },
      color: POLICE_COLOR,
      model: CAR_MODELS[1],
    });
    car.isPolice = true;
    car.driver = 'police';
    car.hp = 120;
    state.police.push(car);
    state.cars.push(car);
  }
  while (state.police.length > want) {
    const car = state.police.pop();
    const idx = state.cars.indexOf(car);
    if (idx >= 0) state.cars.splice(idx, 1);
  }
  // Patrol cars chase and ram; officers bust the player on foot.
  for (const car of state.police) {
    const dx = p.x - car.x; const dy = p.y - car.y;
    const d = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 3 * dt));
    const top = 300 + p.wanted * 26;
    car.speed += (top - car.speed) * dt * 1.2;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.siren = (car.siren ?? 0) + dt;
    // Ram: damage the player's car, or knock the player down on foot.
    if (d < 46) {
      if (state.playerCar) {
        state.playerCar.hp -= 26 * dt;
        state.playerCar.speed *= 0.96;
        state.shake = 0.25;
      } else {
        state.bustTimer += dt;
        state.banner = { text: 'THE POLICE ARE GRABBING YOU — RUN!', color: '#e5534b', t: 0.4 };
        if (state.bustTimer > 1.6) state.gameOver = 'busted';
      }
    } else {
      state.bustTimer = Math.max(0, state.bustTimer - dt);
    }
  }
}
