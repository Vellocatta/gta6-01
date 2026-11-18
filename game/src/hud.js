// The HUD: wanted stars, health, cash, respect, speed, mission objective, dialogue
// banners and the live minimap of Solmar Bay with blips for the player, the mission
// target, police and fares.
import { FONT, PALETTE, VIEW } from './config.js';
import { missionTarget, currentObjective } from './missions.js';

const fonts = new Map();
function font(size) {
  if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
  return fonts.get(size);
}

export function drawHud(ctx, state) {
  const p = state.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: wanted stars.
  ctx.textAlign = 'left';
  ctx.font = font(30);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < p.wanted ? PALETTE.star : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 24 + i * 34, 44);
  }
  // Cash and respect.
  ctx.font = font(22);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`$${p.cash}`, 24, 78);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = font(16);
  ctx.fillText(`RESPECT ${'◆'.repeat(Math.min(6, p.rep))}${'◇'.repeat(Math.max(0, 6 - p.rep))}`, 24, 102);
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(24, 112, 180, 14);
  ctx.fillStyle = p.health > 40 ? PALETTE.good : PALETTE.bad;
  ctx.fillRect(24, 112, 180 * Math.max(0, p.health / 100), 14);
  ctx.fillStyle = PALETTE.text;
  ctx.font = font(13);
  ctx.fillText('HEALTH', 24, 140);
  // Ammo and mode.
  ctx.fillStyle = PALETTE.text;
  ctx.font = font(16);
  ctx.fillText(state.playerCar ? `🚗 ${state.playerCar.model.model}  •  E to exit` : `ON FOOT  •  E near a car to steal it  •  F / click to shoot  •  ${p.ammo} ammo`, 24, VIEW.height - 24);
  if (state.playerCar) {
    ctx.font = font(26);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(state.playerCar.speed) * 0.36)} km/h`, VIEW.width - 24, VIEW.height - 24);
    ctx.textAlign = 'left';
    // Car HP.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(VIEW.width - 224, VIEW.height - 58, 200, 12);
    ctx.fillStyle = state.playerCar.hp > 40 ? '#7fb069' : PALETTE.bad;
    ctx.fillRect(VIEW.width - 224, VIEW.height - 58, 200 * Math.max(0, state.playerCar.hp / 100), 12);
  }
  // Mission objective bar, bottom centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(20,26,38,0.82)';
  const obj = currentObjective(state);
  ctx.font = font(17);
  const w = ctx.measureText(obj).width + 36;
  ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 66, w, 32);
  ctx.fillStyle = PALETTE.mission;
  ctx.fillText('◆ ' + obj, VIEW.width / 2, VIEW.height - 44);
  ctx.textAlign = 'left';
  // Banner.
  if (state.banner && state.banner.t > 0) {
    ctx.textAlign = 'center';
    ctx.font = font(30);
    ctx.fillStyle = state.banner.color;
    ctx.fillText(state.banner.text, VIEW.width / 2, 150);
    ctx.textAlign = 'left';
  }
  // Dialogue line.
  if (state.dialog && state.dialog.t > 0) {
    ctx.fillStyle = 'rgba(20,26,38,0.85)';
    ctx.fillRect(180, VIEW.height - 130, VIEW.width - 360, 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = font(16);
    ctx.textAlign = 'center';
    ctx.fillText(state.dialog.text, VIEW.width / 2, VIEW.height - 98);
    ctx.textAlign = 'left';
  }
  drawMinimap(ctx, state);
}

function drawMinimap(ctx, state) {
  const mw = 220; const mh = 168;
  const x0 = VIEW.width - mw - 20; const y0 = 20;
  const sx = mw / state.city.width; const sy = mh / state.city.height;
  ctx.fillStyle = 'rgba(20,26,38,0.88)';
  ctx.fillRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
  // Water and sand.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#8a9a5b';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x0, y0 + mh * 0.85, mw, mh * 0.15);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0, y0 + mh * 0.2, mw * 0.05, mh * 0.42);
  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const rx of state.city.roadsV) ctx.fillRect(x0 + rx * sx - 3, y0, 6, mh);
  for (const ry of state.city.roadsH) ctx.fillRect(x0, y0 + ry * sy - 3, mw, 6);
  // Mission target blip.
  const target = missionTarget(state);
  if (target) {
    ctx.fillStyle = PALETTE.mission;
    ctx.beginPath();
    ctx.arc(x0 + target.x * sx, y0 + target.y * sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Police blips.
  ctx.fillStyle = '#5aa0ff';
  for (const car of state.police) {
    ctx.beginPath();
    ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = x0 + state.player.x * sx; const py = y0 + state.player.y * sy;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(px, py, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = font(12);
  ctx.fillText('SOLMAR BAY', x0, y0 + mh + 18);
}
