// Screenshot scenes behind ?shot=menu|chase|drive|foot. Each stages a real game state
// with the game's own code — a downtown police chase, a drive through traffic, a walk
// on the marina, the title screen — so the frame is what playing really looks like.
// The same seed always gives the same frame.
import { CAR_MODELS, POLICE_COLOR } from './config.js';
import { makeCar, makeParkedCars, makeTraffic } from './vehicles.js';
import { makePedestrians } from './pedestrians.js';
import { startMission } from './missions.js';

function baseWorld(api) {
  const { state, city, random } = api;
  state.cars = [];
  state.peds = [];
  state.police = [];
  state.bullets = [];
  state.particles = [];
  state.skids = [];
  state.pickups = [];
  state.playerCar = null;
  state.player.wanted = 0;
  state.player.health = 100;
  state.player.cash = 1240;
  state.player.rep = 3;
  state.player.ammo = 48;
  state.gameOver = null;
  state.bustTimer = 0;
  state.fare = null;
  state.mission = null;
  state.nextMissionAt = 0;
  state.banner = null;
  state.dialog = null;
  state.cars.push(...makeParkedCars(city, random, 10));
  state.cars.push(...makeTraffic(city, random, 14));
  state.peds.push(...makePedestrians(city, random, 26));
  // A few cash stashes lying around town.
  for (let i = 0; i < 6; i += 1) {
    const p = city.randomSidewalkPoint();
    state.pickups.push({ x: p.x, y: p.y, kind: 'stash', value: 50, taken: false });
  }
}

function putPlayerInCar(api, modelName, x, y, angle, speed) {
  const { state, city, random } = api;
  const model = CAR_MODELS.find((m) => m.name === modelName) || CAR_MODELS[1];
  const car = makeCar(city, random, { at: { x, y }, angle, model, color: model.color });
  car.speed = speed;
  state.cars.push(car);
  state.playerCar = car;
  state.player.x = x; state.player.y = y;
  state.player.aimAngle = angle;
  return car;
}

function addPoliceChase(api, count) {
  const { state, city, random } = api;
  const p = state.player;
  for (let i = 0; i < count; i += 1) {
    const car = makeCar(city, random, {
      at: { x: p.x - 180 - i * 110, y: p.y + (i % 2 === 0 ? -46 : 52) },
      angle: 0, color: POLICE_COLOR, model: CAR_MODELS[1],
    });
    car.isPolice = true;
    car.driver = 'police';
    car.speed = 340;
    car.siren = i * 0.5;
    state.police.push(car);
    state.cars.push(car);
  }
  // Extra traffic on the same avenue so the chase reads as a chase through a city.
  for (let i = 0; i < 4; i += 1) {
    const car = makeCar(city, random, {
      at: { x: p.x + 220 + i * 150, y: p.y + (i % 2 === 0 ? -46 : 52) },
      angle: i % 2 === 0 ? Math.PI : 0,
    });
    car.speed = 120;
    state.cars.push(car);
  }
  state.player.wanted = 3;
}

/** Stage the named scene on the live state; returns the screen to draw and the scripted input. */
export function stageShot(name, api) {
  const { state, random } = api;
  baseWorld(api);
  if (name === 'chase') {
    putPlayerInCar(api, 'Falco', 1560, 980, 0, 330);
    addPoliceChase(api, 3);
    startMission(state, 3);
    state.banner = { text: 'WANTED — lose the police!', color: '#e5534b', t: 3 };
    state.dialog = { text: 'Rosa: "Three stars, kid. Get to the safehouse in Las Palmas — and don\'t stop for anything."', t: 6 };
    return { screen: 'play', drive: { up: true, down: false, steer: 0 } };
  }
  if (name === 'drive') {
    putPlayerInCar(api, 'Vela', 1150, 980, Math.PI / 2, 260);
    startMission(state, 1);
    state.dialog = { text: 'Rosa: "A package needs legs. Pick it up downtown, deliver it to the yacht. Ninety seconds."', t: 6 };
    return { screen: 'play', drive: { up: true, down: false, steer: 0 } };
  }
  if (name === 'foot') {
    state.player.x = 700; state.player.y = 900;
    state.player.aimAngle = Math.PI;
    // A few residents strolling right beside the player.
    for (let i = 0; i < 5; i += 1) {
      state.peds.push({
        x: 640 + i * 36, y: 860 + (i % 2) * 90,
        angle: random() * Math.PI * 2, speed: 40,
        name: 'Local', shirt: ['#e07a5f', '#81b29a', '#f2cc8f', '#6d9dc5', '#c08497'][i],
        state: 'walk', panic: 0, target: null, retarget: 0, fare: false,
      });
    }
    startMission(state, 2);
    state.dialog = { text: 'Luz: "I\'m on the beach, Playa Dorada. Come get me — drive like the cops are already behind us."', t: 6 };
    return { screen: 'play', drive: null };
  }
  // menu: title screen over a living downtown street.
  putPlayerInCar(api, 'Toro', 1560, 980, 0, 0);
  state.playerCar = null;
  state.player.x = 1560; state.player.y = 1040;
  return { screen: 'title', drive: null };
}
