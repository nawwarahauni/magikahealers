// ═══════════════════════════════════════════════════
// js/loop.js  —  Main render / animation loop
// ═══════════════════════════════════════════════════
'use strict';

const clock = new THREE.Clock();

// ── Star twinkle ──
function tickStars(t) {
  // Vary opacity of each star layer on different sine waves for natural shimmer
  const isNight = currentSkyMode === 'night';
  allStarMats[0].opacity = isNight ? 0.85 + Math.sin(t * 1.3)              * 0.15 : 0.0;
  allStarMats[1].opacity = isNight ? 0.75 + Math.sin(t * 2.1 + 1.0)       * 0.20 : 0.0;
  allStarMats[2].opacity = isNight ? 0.45 + Math.sin(t * 1.7 + 2.5)       * 0.20 : 0.0;
}

// ── Lamp flicker (subtle warm pulse) ──
function tickLamps(t) {
  const isNight = currentSkyMode === 'night';
  lampObjects.forEach((lamp, i) => {
    // Each lamp flickers at a slightly different rate
    const flicker = 1.6 + Math.sin(t * 2.4 + i * 0.7) * 0.4
                       + Math.sin(t * 5.1 + i * 1.3) * 0.1;
    lamp.light.intensity = isNight ? flicker : 0;
    if (lamp.glow) {
      lamp.glow.visible = isNight;
      if (isNight) {
        // Pulse glow brightness
        const bright = Math.min(1, 0.7 + Math.sin(t * 2.4 + i * 0.7) * 0.3);
        lamp.glow.material.color.setRGB(1.0, bright * 0.93, bright * 0.67);
      }
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.getElapsedTime();

  // ── Player movement ──
  if (gameRunning) updatePlayer(dt);

  // ── NPC animation ──
  Object.values(npcObjects).forEach(({ group }) => {
    group.position.y = 0.6 + Math.sin(t * 1.2 + group._bobOffset) * 0.06;

    const toPlayer = new THREE.Vector3(
      pState.pos.x - group.position.x,
      0,
      pState.pos.z - group.position.z
    );
    if (toPlayer.length() > 0.1) {
      const angle = Math.atan2(toPlayer.x, toPlayer.z);
      group.rotation.y += (angle - group.rotation.y) * 0.08;
    }

    const sick = group._state === 'sick';
    group._auraLight.intensity = sick
      ? 1.2 + Math.sin(t * 2   + group._bobOffset) * 0.5
      : 1.8 + Math.sin(t * 1.5)                    * 0.4;
  });

  // ── Tree sway ──
  trees.forEach(tr => {
    tr.rotation.z = Math.sin(t * 0.6 + tr._sway) * 0.015;
    tr.rotation.x = Math.cos(t * 0.4 + tr._sway) * 0.01;
  });

  // ── Magic particles ──
  const mp = mpGeo.attributes.position.array;
  for (let i = 0; i < 300; i++) {
    mp[i*3]   += mpVel[i].x;
    mp[i*3+1] += mpVel[i].y;
    mp[i*3+2] += mpVel[i].z;
    if (mp[i*3+1] > 7) {
      mp[i*3+1] = 0;
      mp[i*3]   = (Math.random() - 0.5) * 50;
      mp[i*3+2] = (Math.random() - 0.5) * 50;
    }
  }
  mpGeo.attributes.position.needsUpdate = true;

  // ── Spell VFX ──
  tickVFX();

  // ── Sky mood transition ──
  tickSkyMode();

  // ── Stars twinkle ──
  tickStars(t);

  // ── Lamp flicker ──
  tickLamps(t);

  // ── Nearby NPC hint ──
  const nearNPC = getNearbyNPC();
  const hint    = document.getElementById('interact-hint');
  hint.style.display = (nearNPC && dialogPhase === 0 && gameRunning) ? 'block' : 'none';
  if (nearNPC) hint.textContent = '[E] Talk to ' + nearNPC.name;

  renderer.render(scene, camera);
}

animate();