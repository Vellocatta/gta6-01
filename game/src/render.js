// Drawing only: the camera, the sun-soaked city, cars, people, effects and the screens.
// The 1280x720 view is scaled to fit the window; the world is drawn in camera space.
import { FONT, PALETTE, VIEW } from './config.js';
import { missionTarget } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const fonts = new Map();
function font(size, bold) {
  const key = `${bold ? 'b' : ''}${size}`;
  if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
  return fonts.get(key);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    canvas.width = w; canvas.height = h;
    view.scale = Math.min(w / VIEW.width, h / VIEW.height);
    view.x = (w - VIEW.width * view.scale) / 2;
    view.y = (h - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = font(size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(value, x, y);
  }

  function drawCity(state) {
    const city = state.city;
    const cam = state.camera;
    const x0 = Math.max(0, cam.x - 40); const y0 = Math.max(0, cam.y - 40);
    const x1 = Math.min(city.width, cam.x + VIEW.width + 40); const y1 = Math.min(city.height, cam.y + VIEW.height + 40);
    // Ground: grass, sand beach, marina water, sea.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, Math.max(y0, 2240), x1 - x0, Math.max(0, y1 - Math.max(y0, 2240)));
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x0, Math.max(y0, 2380), x1 - x0, Math.max(0, y1 - Math.max(y0, 2380)));
    ctx.fillRect(Math.max(x0, 0), Math.max(y0, 520), Math.max(0, Math.min(x1, 150) - x0), Math.max(0, Math.min(y1, 1640) - Math.max(y0, 520)));
    // Parks.
    for (const park of city.parks) {
      if (park.x > x1 || park.x + park.w < x0 || park.y > y1 || park.y + park.h < y0) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const rx of city.roadsV) if (rx > x0 - 60 && rx < x1 + 60) ctx.fillRect(rx - 48, y0, 96, y1 - y0);
    for (const ry of city.roadsH) if (ry > y0 - 60 && ry < y1 + 60) ctx.fillRect(x0, ry - 48, x1 - x0, 96);
    // Road centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const rx of city.roadsV) {
      if (rx < x0 - 60 || rx > x1 + 60) continue;
      for (let y = Math.floor(y0 / 44) * 44; y < y1; y += 44) ctx.fillRect(rx - 2, y, 4, 22);
    }
    for (const ry of city.roadsH) {
      if (ry < y0 - 60 || ry > y1 + 60) continue;
      for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) ctx.fillRect(x, ry - 2, 22, 4);
    }
    // Sidewalk edges.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    for (const rx of city.roadsV) {
      if (rx < x0 - 60 || rx > x1 + 60) continue;
      ctx.beginPath(); ctx.moveTo(rx - 52, y0); ctx.lineTo(rx - 52, y1); ctx.moveTo(rx + 52, y0); ctx.lineTo(rx + 52, y1); ctx.stroke();
    }
    // Boats in the marina.
    for (const boat of city.boats) {
      ctx.save();
      ctx.translate(boat.x, boat.y);
      ctx.rotate(boat.angle);
      ctx.fillStyle = '#f5f1e6';
      ctx.fillRect(-26, -9, 52, 18);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-26, -9, 12, 18);
      ctx.restore();
    }
    // Buildings with roofs, windows and soft shadows.
    for (const b of city.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.kind === 'downtown' ? PALETTE.downtown : b.kind === 'suburb' ? PALETTE.house : PALETTE.building;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.kind === 'downtown' ? PALETTE.downtownRoof : b.kind === 'suburb' ? PALETTE.houseRoof : PALETTE.buildingRoof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let wy = b.y + 16; wy < b.y + b.h - 12; wy += 22) {
          for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 26) ctx.fillRect(wx, wy, 12, 8);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 6, 16, 12);
      }
    }
    // Trees and palms.
    for (const t of city.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      if (t.palm) {
        ctx.strokeStyle = '#8c6a4f'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + 4, t.y - 16); ctx.stroke();
        ctx.fillStyle = PALETTE.palm;
        ctx.beginPath(); ctx.arc(t.x + 4, t.y - 20, 11, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = PALETTE.tree;
        ctx.beginPath(); ctx.arc(t.x, t.y, 12, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const w = car.model.w; const h = car.model.h;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    ctx.fillStyle = car.wrecked ? '#2b2b2b' : car.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-w / 6, -h / 2 + 3, w / 3, h - 6);
    ctx.fillStyle = '#1c2733';
    ctx.fillRect(w / 4 - 4, -h / 2 + 2, 8, 5);
    ctx.fillRect(w / 4 - 4, h / 2 - 7, 8, 5);
    if (car.isPolice) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 2, w - 8, 6);
      ctx.fillStyle = '#e5534b';
      const blink = Math.floor((car.siren || 0) * 4) % 2 === 0;
      ctx.fillRect(blink ? -8 : 2, -h / 2 - 3, 7, 5);
      ctx.fillStyle = '#4f8fd0';
      ctx.fillRect(blink ? 2 : -8, -h / 2 - 3, 7, 5);
    }
    if (car.isTaxi) {
      ctx.fillStyle = '#111';
      ctx.font = font(9, true);
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    ctx.restore();
  }

  function drawPed(ped) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(ped.x + 2, ped.y + 4, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(ped.x, ped.y - 3, 5, 0, Math.PI * 2); ctx.fill();
    if (ped.panic > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = font(14, true);
      ctx.textAlign = 'center';
      ctx.fillText('!', ped.x, ped.y - 16);
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (state.playerCar) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.aimAngle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 4, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    // A white ring so the player reads at a glance among the traffic.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b3a4a';
    ctx.fillRect(6, -3, 14, 6);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Aim line, short and subtle.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.aimAngle) * 18, p.y + Math.sin(p.aimAngle) * 18);
    ctx.lineTo(p.x + Math.cos(p.aimAngle) * 46, p.y + Math.sin(p.aimAngle) * 46);
    ctx.stroke();
  }

  function drawWorld(state) {
    drawCity(state);
    // Cash bags and pickups.
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      ctx.fillStyle = '#7fdb8a';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c2733';
      ctx.font = font(12, true); ctx.textAlign = 'center';
      ctx.fillText('$', pk.x, pk.y + 4);
    }
    // Mission target beacon.
    const target = missionTarget(state);
    if (target) {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.fillStyle = `rgba(255,159,28,${0.25 + pulse * 0.3})`;
      ctx.beginPath(); ctx.arc(target.x, target.y, 46 + pulse * 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.mission; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(target.x, target.y, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PALETTE.mission;
      ctx.font = font(13, true); ctx.textAlign = 'center';
      ctx.fillText(target.label.toUpperCase(), target.x, target.y - 56);
    }
    // Safehouse marker.
    ctx.fillStyle = '#7fdb8a';
    ctx.font = font(12, true); ctx.textAlign = 'center';
    ctx.fillText('⌂ SAFEHOUSE', 2600, 1290);
    for (const car of state.cars) drawCar(car);
    for (const ped of state.peds) drawPed(ped);
    drawPlayer(state);
    // Bullets.
    ctx.fillStyle = '#ffd166';
    for (const b of state.bullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.max), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Skid marks.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 4;
    for (const s of state.skids) {
      ctx.globalAlpha = Math.max(0, s.life / 2);
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt) {
    const w = 640;
    const h = 150 + lines.length * 34 + 70;
    const x = (VIEW.width - w) / 2; const y = (VIEW.height - h) / 2;
    ctx.fillStyle = 'rgba(20,26,38,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.panelEdge; ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    text(title, VIEW.width / 2, y + 72, 46, PALETTE.text, 'center', true);
    lines.forEach((line, i) => text(line, VIEW.width / 2, y + 128 + i * 34, 19, PALETTE.muted, 'center'));
    text(prompt, VIEW.width / 2, y + h - 34, 22, PALETTE.panelEdge, 'center', true);
  }

  function drawTitle(state) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(26,15,46,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text('SOLMAR', VIEW.width / 2, 200, 96, '#ffd166', 'center', true);
    text('SUNSET HEIST', VIEW.width / 2, 260, 44, PALETTE.text, 'center', true);
    text('An open-world crime story in Solmar Bay', VIEW.width / 2, 306, 22, PALETTE.muted, 'center');
    const lines = [
      'Steal cars • Outrun the police • Run six story missions',
      'WASD drive & walk • E enter / steal a car • F shoot • M next job',
      'Taxi fares and cash stashes pay on the side. Respect opens the city.',
    ];
    lines.forEach((line, i) => text(line, VIEW.width / 2, 380 + i * 32, 20, PALETTE.text, 'center'));
    text('Press ENTER or click to play', VIEW.width / 2, 540, 26, PALETTE.panelEdge, 'center', true);
    if (state.bestCash > 0) text(`Best cash: $${state.bestCash}`, VIEW.width / 2, 580, 18, PALETTE.muted, 'center');
  }

  function draw(state, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a0f2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 30 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 30 : 0;
    ctx.save();
    ctx.translate(-state.camera.x + shakeX, -state.camera.y + shakeY);
    drawWorld(state);
    ctx.restore();
    if (screen === SCREEN_TITLE) { drawTitle(state); return; }
    // HUD is drawn in screen space by hud.js through the state hook.
    state.drawHud?.(ctx, state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The city waits for you.'], 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      const over = state.gameOver === 'busted' ? 'BUSTED!' : 'WASTED!';
      drawPanel(over, [`Cash: $${state.player.cash}`, `Missions done: ${state.stats.missionsDone}`, `Cars stolen: ${state.stats.carsStolen}`], 'Press ENTER to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
