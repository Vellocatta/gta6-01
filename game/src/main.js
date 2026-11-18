// SOLMAR: Sunset Heist — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and game over. On foot the player walks,
// steals cars, shoots and runs jobs; in a car they drive, outrun the police and deliver.
//
// ?seed=N fixes the city. ?shot=menu|chase|drive|foot (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { CITY, PLAYER, SAVE_KEY, STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './world.js';
import { drivePlayerCar, makeParkedCars, makeTraffic, nearestCar, updateTraffic, carsCollide } from './vehicles.js';
import { makePedestrians, updatePedestrians } from './pedestrians.js';
import { addWanted, updatePolice } from './police.js';
import { MISSIONS, currentObjective, startMission, updateMissions } from './missions.js';
import { fireBullet, updateBullets, updateParticles } from './combat.js';
import { createAudio } from './audio.js';
import { drawHud } from './hud.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MISSION, ACTION_PAUSE, ACTION_SHOOT, createInput } from './input.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const random = createRandom(seed);
const city = createCity(random);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null') || {};
  } catch {
    return {};
  }
}
function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.player.cash,
      missionsDone: state.stats.missionsDone,
      bestCash: Math.max(state.bestCash, state.player.cash),
    }));
  } catch { /* storage can be off: progress then lasts this visit only */ }
}

function createState() {
  const save = readSave();
  const state = {
    time: 0, city, random,
    screen: SCREEN_TITLE,
    player: {
      x: 1560, y: 1040, angle: 0, aimAngle: 0,
      health: PLAYER.health, cash: save.cash ?? PLAYER.startCash,
      rep: 0, wanted: 0, ammo: PLAYER.startAmmo,
    },
    playerCar: null,
    cars: [], peds: [], police: [], bullets: [], particles: [], skids: [], pickups: [],
    mission: null, nextMissionAt: 0, missionDone: -1, storyDone: false,
    stats: { missionsDone: save.missionsDone ?? 0, carsStolen: 0, faresDone: 0 },
    camera: { x: 1560 - VIEW.width / 2, y: 1040 - VIEW.height / 2 },
    shake: 0, bustTimer: 0, heatTimer: 9,
    banner: null, dialog: null, gameOver: null, fare: null,
    bestCash: save.bestCash ?? 0,
    lastShot: null,
    audio, drawHud,
  };
  state.cars.push(...makeParkedCars(city, random, 12));
  state.cars.push(...makeTraffic(city, random, 14));
  state.peds.push(...makePedestrians(city, random, 26));
  for (let i = 0; i < 8; i += 1) {
    const p = city.randomSidewalkPoint();
    state.pickups.push({ x: p.x, y: p.y, kind: 'stash', value: 50, taken: false });
  }
  return state;
}

const state = createState();

function updateCamera(dt) {
  const p = state.player;
  const tx = Math.max(0, Math.min(CITY.width - VIEW.width, p.x - VIEW.width / 2));
  const ty = Math.max(0, Math.min(CITY.height - VIEW.height, p.y - VIEW.height / 2));
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
}

function tryEnterCar() {
  const p = state.player;
  if (state.playerCar) {
    // Exit the car.
    const car = state.playerCar;
    car.speed = 0;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 36;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 36;
    p.aimAngle = car.angle;
    state.playerCar = null;
    return;
  }
  const car = nearestCar(state.cars, p.x, p.y, 64);
  if (!car || car.wrecked) return;
  if (car.isPolice) addWanted(state, 2, 'YOU STOLE A POLICE CRUISER!');
  else if (car.driver === 'traffic') {
    addWanted(state, 1, 'CAR STOLEN — witnesses called it in!');
    state.stats.carsStolen += 1;
  } else if (car.parked) {
    addWanted(state, 1, 'CAR STOLEN!');
    state.stats.carsStolen += 1;
  }
  car.parked = false;
  car.driver = 'player';
  state.playerCar = car;
  p.x = car.x; p.y = car.y;
  audio.pickup();
}

function tryTaxi() {
  // With a fare passenger waiting by the road, E picks them up when driving past.
  if (!state.playerCar || state.fare) return false;
  const p = state.player;
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    if (!ped.fare) continue;
    const dx = ped.x - p.x; const dy = ped.y - p.y;
    if (dx * dx + dy * dy < 80 * 80) {
      const dest = city.randomRoadPoint();
      state.fare = { dest, reward: 60 + Math.floor(random() * 60), name: ped.name };
      state.peds.splice(i, 1);
      state.banner = { text: `${ped.name} hops in — drive to the yellow blip!`, color: '#7fdb8a', t: 3 };
      return true;
    }
  }
  return false;
}

function updatePlayer(input, dt) {
  const p = state.player;
  if (state.playerCar) {
    const car = state.playerCar;
    const skidding = drivePlayerCar(car, input, dt);
    const ox = car.x; const oy = car.y;
    if (city.blocked(car.x, car.y, 20)) {
      car.x = ox; car.y = oy;
      if (Math.abs(car.speed) > 150) { audio.crash(); state.shake = 0.3; car.hp -= 8; }
      car.speed *= 0.4;
    }
    p.x = car.x; p.y = car.y; p.aimAngle = car.angle;
    if (skidding) {
      state.skids.push({ x1: car.x, y1: car.y, x2: car.x - Math.cos(car.angle) * 20, y2: car.y - Math.sin(car.angle) * 20, life: 2 });
      if (state.skids.length > 40) state.skids.shift();
    }
    // Bump traffic.
    for (const other of state.cars) {
      if (other === car || other.wrecked) continue;
      if (carsCollide(car, other)) {
        other.hp -= 6;
        car.hp -= 3;
        car.speed *= 0.85;
        other.speed = Math.max(0, other.speed - 60);
        state.shake = Math.max(state.shake, 0.15);
        if (other.hp <= 0 && !other.wrecked) {
          other.wrecked = true;
          addWanted(state, 1, 'YOU WRECKED A CAR!');
        }
      }
    }
    if (car.hp <= 0) {
      car.wrecked = true;
      state.playerCar = null;
      p.health -= 25;
      p.x = car.x + 40; p.y = car.y + 40;
      state.banner = { text: 'YOUR CAR IS WRECKED!', color: '#e5534b', t: 3 };
    }
    audio.setEngine(true, Math.abs(car.speed) / 460);
    return;
  }
  // On foot.
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const mx = input.forward; const my = input.strafe;
  const len = Math.hypot(mx, my) || 1;
  const nx = p.x + (mx / len) * speed * dt * (mx || my ? 1 : 0);
  const ny = p.y + (my / len) * speed * dt * (mx || my ? 1 : 0);
  if (!city.blocked(nx, p.y, PLAYER.radius)) p.x = nx;
  if (!city.blocked(p.x, ny, PLAYER.radius)) p.y = ny;
  if (mx || my) p.aimAngle = Math.atan2(my, mx);
  // Mouse aim.
  const mouse = input.mouseWorld;
  if (mouse) p.aimAngle = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  audio.setEngine(false, 0);
}

function updatePickups(dt) {
  const p = state.player;
  for (const pk of state.pickups) {
    if (pk.taken) continue;
    const dx = pk.x - p.x; const dy = pk.y - p.y;
    if (dx * dx + dy * dy < 34 * 34) {
      pk.taken = true;
      p.cash += pk.value;
      audio.pickup();
      state.particles.push({ x: pk.x, y: pk.y, vx: 0, vy: -40, life: 0.6, max: 0.6, color: '#7fdb8a', size: 8 });
      if (pk.kind === 'bag' && state.mission?.active) state.mission.bags += 1;
      state.banner = { text: `+$${pk.value}`, color: '#7fdb8a', t: 1.2 };
    }
  }
  // Taxi fare arrival.
  if (state.fare) {
    const dx = state.fare.dest.x - p.x; const dy = state.fare.dest.y - p.y;
    if (dx * dx + dy * dy < 120 * 120) {
      p.cash += state.fare.reward;
      state.stats.faresDone += 1;
      state.banner = { text: `FARE PAID — +$${state.fare.reward}`, color: '#7fdb8a', t: 3 };
      audio.mission();
      state.fare = null;
    }
  }
}

function stepWorld(input, dt) {
  state.time += dt;
  if (state.banner) { state.banner.t -= dt; if (state.banner.t <= 0) state.banner = null; }
  if (state.dialog) { state.dialog.t -= dt; if (state.dialog.t <= 0) state.dialog = null; }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  for (const s of state.skids) s.life -= dt;
  state.skids = state.skids.filter((s) => s.life > 0);

  updatePlayer(input, dt);
  for (const car of state.cars) {
    if (car.driver === 'traffic') updateTraffic(car, city, random, state.cars, dt);
  }
  updatePedestrians(state.peds, city, state.lastShot, dt);
  state.lastShot = null;
  updatePolice(state, city, random, dt);
  updateBullets(state, dt);
  updateParticles(state, dt);
  updatePickups(dt);
  updateMissions(state, dt);
  // Slow health regen when the heat is off.
  if (state.player.wanted === 0 && state.player.health < PLAYER.health) {
    state.player.health = Math.min(PLAYER.health, state.player.health + 2 * dt);
  }
  if (state.player.health <= 0) state.gameOver = 'wasted';
  if (state.gameOver) {
    state.screen = SCREEN_OVER;
    writeSave(state);
  }
  updateCamera(dt);
}

function startGame() {
  Object.assign(state, createState());
  state.screen = SCREEN_PLAY;
  startMission(state, 0);
  audio.start();
}

function runShot(name) {
  const scene = stageShot(name, { state, city, random });
  // Let the staged scene live for a brief moment so traffic, cops and peds settle
  // naturally — but not so long the player drives out of the staged frame.
  const input = scene.drive ?? { up: false, down: false, steer: 0, forward: 0, strafe: 0, run: false };
  for (let i = 0; i < 25; i += 1) {
    state.time += STEP;
    if (scene.drive) updatePlayer({ ...input, forward: input.up ? 1 : 0, strafe: input.steer, mouseWorld: null }, STEP);
    for (const car of state.cars) if (car.driver === 'traffic') updateTraffic(car, city, random, state.cars, STEP);
    updatePedestrians(state.peds, city, null, STEP);
    updatePolice(state, city, random, STEP);
    updateParticles(state, STEP);
  }
  updateCamera(1);
  state.camera.x = Math.max(0, Math.min(CITY.width - VIEW.width, state.player.x - VIEW.width / 2));
  state.camera.y = Math.max(0, Math.min(CITY.height - VIEW.height, state.player.y - VIEW.height / 2));
  state.screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(state, state.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function mouseWorld() {
    const m = input.mouse();
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
    const ox = (rect.width - VIEW.width * scale) / 2;
    const oy = (rect.height - VIEW.height * scale) / 2;
    return {
      x: (m.x - ox) / scale + state.camera.x,
      y: (m.y - oy) / scale + state.camera.y,
    };
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.start();
      if (state.screen === SCREEN_TITLE || state.screen === SCREEN_OVER) startGame();
      else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
    }
    // Clicking the title screen starts the game too.
    if (actions & ACTION_SHOOT && state.screen === SCREEN_TITLE) {
      audio.start();
      startGame();
    }
    if (actions & ACTION_PAUSE) {
      if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
      else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
    }
    if (actions & ACTION_ENTER && state.screen === SCREEN_PLAY) {
      if (!tryTaxi()) tryEnterCar();
    }
    if (actions & ACTION_SHOOT && state.screen === SCREEN_PLAY && !state.playerCar) {
      state.lastShot = { x: state.player.x, y: state.player.y };
      fireBullet(state);
    }
    if (actions & ACTION_MISSION && state.screen === SCREEN_PLAY) {
      if (!state.mission?.active && !state.nextMissionAt) {
        const next = state.missionDone + 1;
        if (next < MISSIONS.length) startMission(state, next);
        else state.banner = { text: 'All missions complete — Solmar is yours!', color: '#7fdb8a', t: 3 };
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (state.screen === SCREEN_TITLE) {
      // A living street behind the title.
      while (accumulator >= STEP) {
        state.time += STEP;
        for (const car of state.cars) if (car.driver === 'traffic') updateTraffic(car, city, random, state.cars, STEP);
        updatePedestrians(state.peds, city, null, STEP);
        state.camera.x = 1150 - VIEW.width / 2 + Math.sin(state.time * 0.05) * 120;
        state.camera.y = 980 - VIEW.height / 2;
        accumulator -= STEP;
      }
    } else if (state.screen === SCREEN_PLAY) {
      while (accumulator >= STEP && state.screen === SCREEN_PLAY) {
        const read = input.read();
        stepWorld({ ...read, mouseWorld: mouseWorld() }, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, state.screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
