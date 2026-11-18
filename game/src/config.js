// SOLMAR: Sunset Heist — every tuning number, colour and name in one place.
// A sun-soaked coastal city of our own: Solmar Bay, districts, cars, people and prices.
// The playfield is a 1280x720 view into a 3400x2600 city; the renderer scales to the window.

export const STEP = 1 / 60;
export const VIEW = { width: 1280, height: 720 };
export const CITY = { width: 3400, height: 2600 };
export const ROAD_W = 96;
export const SAVE_KEY = 'solmar.save.v1';

export const PLAYER = {
  walkSpeed: 210,
  runSpeed: 300,
  radius: 13,
  health: 100,
  startCash: 120,
  startAmmo: 48,
};

export const CAR = {
  maxSpeed: 460,
  accel: 320,
  brake: 520,
  turn: 2.6,
  drag: 0.6,
  hp: 100,
};

// Car models: name, colour, top speed factor, size. All original Solmar makes.
export const CAR_MODELS = [
  { name: 'Pinto', model: 'Coral Runabout', color: '#e8a33d', speed: 0.82, w: 44, h: 22 },
  { name: 'Vela', model: 'Solmar Sedan', color: '#4f8fd0', speed: 0.9, w: 48, h: 23 },
  { name: 'Brisa', model: 'Beach Buggy', color: '#e86a8a', speed: 0.86, w: 46, h: 23 },
  { name: 'Toro', model: 'Muscle Coupe', color: '#c0392b', speed: 1.05, w: 50, h: 24 },
  { name: 'Falco', model: 'Sports GT', color: '#f2c94c', speed: 1.22, w: 50, h: 23 },
  { name: 'Carga', model: 'Delivery Van', color: '#7d8a96', speed: 0.75, w: 56, h: 26 },
  { name: 'Taxi', model: 'Solmar Cab', color: '#f5b301', speed: 0.92, w: 48, h: 23 },
];

export const POLICE_COLOR = '#1c3f94';
export const WANTED_MAX = 5;

export const DISTRICTS = [
  { name: 'Downtown Solmar', x: 1150, y: 700, w: 1100, h: 900, kind: 'downtown' },
  { name: 'Marina del Sol', x: 0, y: 500, w: 700, h: 1100, kind: 'marina' },
  { name: 'Playa Dorada', x: 0, y: 1700, w: 3400, h: 900, kind: 'beach' },
  { name: 'Las Palmas', x: 2250, y: 500, w: 1150, h: 1100, kind: 'suburb' },
  { name: 'Puerto Norte', x: 700, y: 0, w: 2700, h: 500, kind: 'industrial' },
];

export const PALETTE = {
  sky: '#f7b267',
  grass: '#7fb069',
  grassDark: '#6a9e58',
  sand: '#f2d492',
  water: '#2e86ab',
  waterDeep: '#1f6a8c',
  road: '#3a3f4a',
  roadLine: '#f2c94c',
  sidewalk: '#9aa0a8',
  building: '#b08968',
  buildingRoof: '#8c6a4f',
  downtown: '#5b6b7a',
  downtownRoof: '#39434f',
  house: '#e07a5f',
  houseRoof: '#b25b45',
  park: '#5da271',
  tree: '#2f7d4f',
  palm: '#3e9e5c',
  player: '#ffd166',
  police: '#4f8fd0',
  star: '#f2c94c',
  panel: '#141a26',
  panelEdge: '#f2c94c',
  text: '#f5f1e6',
  muted: '#b8b0a0',
  good: '#7fdb8a',
  bad: '#e5534b',
  mission: '#ff9f1c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Street names of Solmar Bay — all invented.
export const STREETS = [
  'Avenida del Sol', 'Calle Coral', 'Paseo Marina', 'Boulevard Palma',
  'Calle Arena', 'Avenida Faro', 'Calle Mango', 'Paseo Norte', 'Calle Brisa',
];
