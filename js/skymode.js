// ═══════════════════════════════════════════════════
// js/skymode.js  —  Day / Night mood switcher
// Triggered by finger count gestures:
//   1 finger  →  NOON  (bright sun)
//   2 fingers →  NIGHT (dark stars)
// ═══════════════════════════════════════════════════
'use strict';

// ── Sky presets ──
const SKY_MODES = {
  noon: {
    label:      '☀️ NOON',
    bg:         0x87ceeb,   // sky blue
    fog:        0x87ceeb,
    fogDensity: 0.018,
    ambient:    { color: 0xfff4cc, intensity: 3.5 },
    sun:        { color: 0xffffff, intensity: 2.2 },
    fill:       { color: 0xaaddff, intensity: 0.8 },
    groundTint: 0x4a9a30,
  },
  night: {
    label:      '🌙 NIGHT',
    bg:         0x01000a,
    fog:        0x01000a,
    fogDensity: 0.05,
    ambient:    { color: 0x0a0820, intensity: 1.0 },
    sun:        { color: 0x2233aa, intensity: 0.3 },
    fill:       { color: 0x111133, intensity: 0.2 },
    groundTint: 0x1a3a10,
  },
};

// Current mode
let currentSkyMode = 'night'; // default is the original dark look

// ── Smooth transition state ──
const skyTransition = {
  active:   false,
  from:     'night',
  to:       'night',
  progress: 1.0,   // 0→1
  duration: 120,   // frames (~4s at 30fps)
  frame:    0,
};

// ── Helper: lerp a hex color ──
function lerpColor(hexA, hexB, t) {
  const r1 = (hexA >> 16) & 0xff, g1 = (hexA >> 8) & 0xff, b1 = hexA & 0xff;
  const r2 = (hexB >> 16) & 0xff, g2 = (hexB >> 8) & 0xff, b2 = hexB & 0xff;
  return (
    (Math.round(r1 + (r2 - r1) * t) << 16) |
    (Math.round(g1 + (g2 - g1) * t) << 8)  |
    Math.round(b1 + (b2 - b1) * t)
  );
}

// ── Sun visual mesh (big glowing sphere in the sky) ──
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(2, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xfffaaa })
);
sunMesh.position.set(40, 35, -40);
sunMesh.visible = false; // hidden at night
scene.add(sunMesh);

// Sun glow (point light near sun mesh)
const sunGlow = new THREE.PointLight(0xfff4aa, 0, 80);
sunGlow.position.copy(sunMesh.position);
scene.add(sunGlow);

// ── Moon visual mesh ──
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
moonMesh.position.set(-35, 30, -30);
moonMesh.visible = true;
scene.add(moonMesh);

// Moon glow
const moonGlow = new THREE.PointLight(0x3344aa, 1.0, 60);
moonGlow.position.copy(moonMesh.position);
scene.add(moonGlow);

// ── References to lights (defined in world.js) ──
// ambientLight, sun, fillLight are globals from world.js
// We reassign them here so skymode can control them
const ambientLight = scene.children.find(c => c.isAmbientLight);

// ── Start a sky transition ──
function setSkyMode(modeName) {
  if (modeName === currentSkyMode) return;
  skyTransition.from     = currentSkyMode;
  skyTransition.to       = modeName;
  skyTransition.active   = true;
  skyTransition.frame    = 0;
  skyTransition.progress = 0;
  currentSkyMode         = modeName;

  // Show HUD notification
  const mode = SKY_MODES[modeName];
  notify(mode.label + ' — Sky changed!');

  // Show sky mode indicator
  updateSkyHUD(modeName);
}

// ── Apply sky instantly (used to init) ──
function applySkyInstant(modeName) {
  const m = SKY_MODES[modeName];
  renderer.setClearColor(m.bg, 1);
  scene.fog.color.setHex(m.fog);
  scene.fog.density = m.fogDensity;
  if (ambientLight) {
    ambientLight.color.setHex(m.ambient.color);
    ambientLight.intensity = m.ambient.intensity;
  }
  sun.color.setHex(m.sun.color);
  sun.intensity = m.sun.intensity;
  fillLight.color.setHex(m.fill.color);
  fillLight.intensity = m.fill.intensity;
  ground.material.color.setHex(m.groundTint);

  sunMesh.visible  = (modeName === 'noon');
  moonMesh.visible = (modeName === 'night');
  sunGlow.intensity  = (modeName === 'noon')  ? 2.0 : 0;
  moonGlow.intensity = (modeName === 'night') ? 1.0 : 0;
}

// ── Tick: smooth transition each frame ──
function tickSkyMode() {
  if (!skyTransition.active) return;

  skyTransition.frame++;
  skyTransition.progress = Math.min(1, skyTransition.frame / skyTransition.duration);

  // Ease in-out
  const t = skyTransition.progress < 0.5
    ? 2 * skyTransition.progress * skyTransition.progress
    : 1 - Math.pow(-2 * skyTransition.progress + 2, 2) / 2;

  const from = SKY_MODES[skyTransition.from];
  const to   = SKY_MODES[skyTransition.to];

  // Background & fog
  const bgColor  = lerpColor(from.bg,  to.bg,  t);
  const fogColor = lerpColor(from.fog, to.fog, t);
  renderer.setClearColor(bgColor, 1);
  scene.fog.color.setHex(fogColor);
  scene.fog.density = from.fogDensity + (to.fogDensity - from.fogDensity) * t;

  // Ambient light
  if (ambientLight) {
    ambientLight.color.setHex(lerpColor(from.ambient.color, to.ambient.color, t));
    ambientLight.intensity = from.ambient.intensity + (to.ambient.intensity - from.ambient.intensity) * t;
  }

  // Sun directional light
  sun.color.setHex(lerpColor(from.sun.color, to.sun.color, t));
  sun.intensity = from.sun.intensity + (to.sun.intensity - from.sun.intensity) * t;

  // Fill light
  fillLight.color.setHex(lerpColor(from.fill.color, to.fill.color, t));
  fillLight.intensity = from.fill.intensity + (to.fill.intensity - from.fill.intensity) * t;

  // Ground tint
  ground.material.color.setHex(lerpColor(from.groundTint, to.groundTint, t));

  // Sun & moon visibility fade
  const isGoingNoon  = skyTransition.to === 'noon';
  sunMesh.visible    = true; moonMesh.visible = true;
  sunGlow.intensity  = isGoingNoon  ? t * 2.0       : (1 - t) * 2.0;
  moonGlow.intensity = isGoingNoon  ? (1 - t) * 1.0 : t * 1.0;
  sunMesh.material.opacity  = isGoingNoon  ? t         : 1 - t;
  moonMesh.material.opacity = isGoingNoon  ? 1 - t     : t;

  if (skyTransition.progress >= 1) {
    skyTransition.active = false;
    sunMesh.visible  = (skyTransition.to === 'noon');
    moonMesh.visible = (skyTransition.to === 'night');
  }
}

// ── Sky mode HUD indicator ──
function updateSkyHUD(mode) {
  const el = document.getElementById('sky-mode-hud');
  if (!el) return;
  el.textContent = SKY_MODES[mode].label;
  el.style.color = mode === 'noon' ? '#ffe066' : '#aabbff';
  el.classList.add('sky-flash');
  setTimeout(() => el.classList.remove('sky-flash'), 600);
}

// ── Finger count detection ──
// Counts how many fingers are extended (index=8, middle=12, ring=16, pinky=20)
// Also checks thumb (tip=4 vs mcp=2)
function countFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0;
  let count = 0;

  // Thumb: compare tip x vs ip x (horizontal check)
  if (Math.abs(landmarks[4].x - landmarks[2].x) > 0.05) count++;

  // 4 fingers: tip.y < pip.y means extended
  const tips = [8,  12, 16, 20];
  const pips = [6,  10, 14, 18];
  tips.forEach((tip, i) => {
    if (landmarks[tip].y < landmarks[pips[i]].y - 0.02) count++;
  });
  return count;
}

// ── Sky gesture hold state ──
const skyGesture = {
  count:      0,
  holdFrames: 0,
  needed:     30,  // ~1s hold to trigger
};

// Called from processHandFrame in hands.js
function processSkyGesture(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    skyGesture.holdFrames = 0;
    skyGesture.count      = 0;
    updateSkyChargeBar(0);
    return;
  }

  // Use the first detected hand for sky control
  const lm    = results.multiHandLandmarks[0];
  const count = countFingers(lm);

  // Only act on 1 or 2 fingers
  if (count === 1 || count === 2) {
    if (count === skyGesture.count) {
      skyGesture.holdFrames++;
      const pct = Math.min(100, (skyGesture.holdFrames / skyGesture.needed) * 100);
      updateSkyChargeBar(pct);

      if (skyGesture.holdFrames === skyGesture.needed) {
        skyGesture.holdFrames = 0;
        updateSkyChargeBar(0);
        if (count === 1) setSkyMode('noon');
        if (count === 2) setSkyMode('night');
      }
    } else {
      // Finger count changed — reset hold
      skyGesture.count      = count;
      skyGesture.holdFrames = 0;
      updateSkyChargeBar(0);
    }
  } else {
    skyGesture.holdFrames = 0;
    skyGesture.count      = 0;
    updateSkyChargeBar(0);
  }

  // Update finger count display
  const el = document.getElementById('sky-finger-count');
  if (el) {
    el.textContent = (count === 1) ? '☝️ 1 = NOON'
                   : (count === 2) ? '✌️ 2 = NIGHT'
                   : (count === 0) ? '—'
                   : count + ' fingers';
  }
}

function updateSkyChargeBar(pct) {
  const bar = document.getElementById('sky-charge');
  if (!bar) return;
  bar.style.width = pct + '%';
  bar.style.background = pct > 0
    ? `linear-gradient(90deg, #ffe06688, #ffe066)`
    : 'transparent';
}

// Apply default sky on load
applySkyInstant('night');