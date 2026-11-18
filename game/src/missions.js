// Missions and story: six jobs for Rosa's crew across Solmar Bay, plus taxi fares and
// cash stashes on the side. Each mission is stages with a target blip; finishing one
// pays cash, raises respect and unlocks the next.
import { addWanted } from './police.js';

export const PLACES = {
  garage: { x: 1560, y: 980, label: "Rosa's Garage" },
  marinaYacht: { x: 240, y: 900, label: 'Yacht "Sirena"' },
  beach: { x: 1700, y: 2200, label: 'Playa Dorada' },
  safehouse: { x: 2600, y: 1320, label: 'Safehouse — Las Palmas' },
  bank: { x: 1560, y: 640, label: 'Banco del Sol' },
  packageSpot: { x: 1150, y: 1320, label: 'Package pickup' },
  luzSpot: { x: 1750, y: 2150, label: 'Luz, waiting on the beach' },
  falcoSpot: { x: 420, y: 760, label: 'The Falco GT' },
};

export const MISSIONS = [
  {
    title: '1 — First Wheels',
    giver: 'Rosa',
    intro: 'Rosa: "Welcome to Solmar, kid. First rule: wheels are borrowed, never bought. Grab any car and bring it to my garage."',
    reward: 150,
    stages: [
      { kind: 'getCar', text: 'Steal a car — walk up to one and press E' },
      { kind: 'goto', at: 'garage', text: 'Drive the car to Rosa\'s Garage' },
    ],
  },
  {
    title: '2 — Courier Run',
    giver: 'Rosa',
    intro: 'Rosa: "A package needs legs. Pick it up downtown, deliver it to the marina yacht. Ninety seconds — the client hates waiting."',
    reward: 250,
    stages: [
      { kind: 'goto', at: 'packageSpot', text: 'Pick up the package downtown' },
      { kind: 'goto', at: 'marinaYacht', text: 'Deliver the package to the yacht — 90s!', time: 90 },
    ],
  },
  {
    title: '3 — The Pickup',
    giver: 'Luz',
    intro: 'Luz: "I\'m on the beach, Playa Dorada. Come get me — and drive like the cops are already behind us, because they will be."',
    reward: 300,
    stages: [
      { kind: 'goto', at: 'luzSpot', text: 'Pick up Luz on Playa Dorada' },
      { kind: 'goto', at: 'marinaYacht', text: 'Drive Luz to the yacht at the marina' },
    ],
  },
  {
    title: '4 — Heat',
    giver: 'Rosa',
    intro: 'Rosa: "You made noise, kid. Three stars and the whole department is awake. Lose them — get to the safehouse in Las Palmas and stay out of sight."',
    reward: 350,
    stages: [
      { kind: 'escape', at: 'safehouse', text: 'Escape the police — reach the Las Palmas safehouse', wanted: 3 },
    ],
  },
  {
    title: '5 — Bank Job',
    giver: 'El Toro',
    intro: 'El Toro: "Banco del Sol. Walk in, take three bags, walk out. The alarm will scream and the city will answer. Make it to the safehouse."',
    reward: 800,
    stages: [
      { kind: 'goto', at: 'bank', text: 'Get to Banco del Sol' },
      { kind: 'grab', at: 'bank', count: 3, text: 'Grab 3 cash bags from the bank' },
      { kind: 'goto', at: 'safehouse', text: 'Escape to the safehouse', wanted: 4 },
    ],
  },
  {
    title: '6 — The Last Score',
    giver: 'Rosa',
    intro: 'Rosa: "One last job. A Falco GT is parked at the marina — the mayor\'s own toy. Steal it, bring it to the Sirena, and Solmar is yours."',
    reward: 1500,
    stages: [
      { kind: 'goto', at: 'falcoSpot', text: 'Steal the Falco GT at the marina' },
      { kind: 'goto', at: 'marinaYacht', text: 'Deliver the Falco to the yacht "Sirena"' },
    ],
  },
];

export function startMission(state, index) {
  const def = MISSIONS[index];
  state.mission = { index, stage: 0, def, timer: 0, bags: 0, active: true };
  state.dialog = { text: def.intro, t: 6 };
  state.banner = { text: def.title, color: '#ff9f1c', t: 3 };
  const stage = def.stages[0];
  if (stage.kind === 'escape') addWanted(state, stage.wanted - state.player.wanted, 'WANTED — the police are coming!');
  if (stage.kind === 'grab') spawnBags(state, PLACES[stage.at], stage.count);
}

export function spawnBags(state, place, count) {
  for (let i = 0; i < count; i += 1) {
    state.pickups.push({
      x: place.x + (i - 1) * 70, y: place.y + 40,
      kind: 'bag', value: 200, taken: false,
    });
  }
}

export function missionTarget(state) {
  const m = state.mission;
  if (!m || !m.active) return null;
  const stage = m.def.stages[m.stage];
  if (!stage) return null;
  if (stage.kind === 'getCar') return null;
  return PLACES[stage.at];
}

export function currentObjective(state) {
  const m = state.mission;
  if (!m || !m.active) return 'Free roam — press M for the next job. Taxi fares pay cash.';
  const stage = m.def.stages[m.stage];
  return `${m.def.title}: ${stage.text}`;
}

function advanceStage(state) {
  const m = state.mission;
  m.stage += 1;
  if (m.stage >= m.def.stages.length) {
    completeMission(state);
    return;
  }
  const stage = m.def.stages[m.stage];
  if (stage.time) m.timer = stage.time;
  if (stage.kind === 'grab') spawnBags(state, PLACES[stage.at], stage.count);
  if (stage.wanted) addWanted(state, stage.wanted - state.player.wanted, 'WANTED — run!');
  state.banner = { text: 'Objective updated', color: '#7fdb8a', t: 2 };
}

function completeMission(state) {
  const m = state.mission;
  state.player.cash += m.def.reward;
  state.player.rep += 1;
  state.stats.missionsDone += 1;
  state.banner = { text: `MISSION COMPLETE — +$${m.def.reward}`, color: '#7fdb8a', t: 4 };
  state.dialog = { text: `${m.def.giver}: "Clean work. $${m.def.reward} is yours. Respect grows, kid."`, t: 5 };
  m.active = false;
  state.missionDone = m.index;
  if (m.index + 1 < MISSIONS.length) {
    state.nextMissionAt = state.time + 2;
  } else {
    state.storyDone = true;
    state.dialog = { text: 'Rosa: "That\'s the last score. Solmar Bay is yours now — every street, every car, every sunset."', t: 8 };
  }
}

export function updateMissions(state, dt) {
  const m = state.mission;
  if (!m) return;
  if (state.nextMissionAt && state.time >= state.nextMissionAt) {
    state.nextMissionAt = 0;
    startMission(state, m.index + 1);
    return;
  }
  if (!m.active) return;
  const stage = m.def.stages[m.stage];
  const p = state.player;
  if (stage.time) {
    m.timer -= dt;
    if (m.timer <= 0) {
      state.banner = { text: 'TOO SLOW — the client walked away', color: '#e5534b', t: 3 };
      m.active = false;
      state.nextMissionAt = state.time + 3;
      return;
    }
  }
  if (stage.kind === 'getCar') {
    if (state.playerCar) advanceStage(state);
  } else if (stage.kind === 'goto' || stage.kind === 'escape') {
    const at = PLACES[stage.at];
    const dx = p.x - at.x; const dy = p.y - at.y;
    if (dx * dx + dy * dy < 90 * 90) {
      if (stage.kind === 'escape' && p.wanted > 0) {
        p.wanted = 0;
        state.police.length = 0;
        state.banner = { text: 'HEAT LOST — the cops gave up', color: '#7fdb8a', t: 3 };
      }
      advanceStage(state);
    }
  } else if (stage.kind === 'grab') {
    if (m.bags >= stage.count) advanceStage(state);
  }
}
