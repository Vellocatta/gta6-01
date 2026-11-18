// Combat: the player's pistol, bullets, muzzle flash and the damage they do to
// people, cars and the law. Shooting in public is a crime — the wanted level notices.
import { addWanted } from './police.js';

export function fireBullet(state) {
  const p = state.player;
  if (p.ammo <= 0) {
    state.banner = { text: 'OUT OF AMMO', color: '#e5534b', t: 1.2 };
    return;
  }
  p.ammo -= 1;
  const a = p.aimAngle;
  state.bullets.push({
    x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
    vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.7,
  });
  state.particles.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: 0, vy: 0, life: 0.12, max: 0.12, color: '#ffd166', size: 10 });
  state.shake = 0.12;
  addWanted(state, 1, 'SHOTS FIRED — witnesses called the police!');
  state.audio?.shoot();
}

export function updateBullets(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      // Hit a pedestrian.
      for (const ped of state.peds) {
        const dx = ped.x - b.x; const dy = ped.y - b.y;
        if (dx * dx + dy * dy < 16 * 16) {
          ped.panic = 4; ped.angle = Math.atan2(dy, dx);
          state.particles.push({ x: b.x, y: b.y, vx: 0, vy: -30, life: 0.4, max: 0.4, color: '#e5534b', size: 6 });
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of state.cars) {
        const dx = car.x - b.x; const dy = car.y - b.y;
        if (dx * dx + dy * dy < 30 * 30) {
          car.hp -= 12;
          state.particles.push({ x: b.x, y: b.y, vx: 0, vy: -20, life: 0.3, max: 0.3, color: '#f2c94c', size: 5 });
          if (car.hp <= 0) {
            car.wrecked = true;
            state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.8, max: 0.8, color: '#ff7b00', size: 40 });
            addWanted(state, 1, 'CAR DESTROYED!');
          }
          dead = true;
          break;
        }
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }
  // Wrecked cars are towed away after a while.
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    const car = state.cars[i];
    if (car.wrecked) {
      car.wreckTimer = (car.wreckTimer ?? 0) + dt;
      if (car.wreckTimer > 6) {
        state.cars.splice(i, 1);
        const pi = state.police.indexOf(car);
        if (pi >= 0) state.police.splice(pi, 1);
        if (state.playerCar === car) state.playerCar = null;
      }
    }
  }
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
}
