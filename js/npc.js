// ═══════════════════════════════════════════════════
// js/npc.js  —  GLB NPC loading + movement AI
// GLB models only — no box fallback meshes
// Behaviours: stay | wander | patrol
// ═══════════════════════════════════════════════════
'use strict';

const npcObjects = {}; // id → { group, data }

// ══════════════════════════════════════════════════
// SPRITE HELPER  (sick / healed label above NPC)
// ══════════════════════════════════════════════════
function makeTextSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle    = color || '#ffcc00';
  ctx.font         = 'bold 34px monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp  = new THREE.Sprite(mat);
  sp.scale.set(1.2, 0.6, 1);
  return sp;
}

// ══════════════════════════════════════════════════
// REGISTER NPC  —  creates the group, lights, sprites
// and wires up movement behaviour state.
// Called once per NPC entry in NPCS_DATA.
// The actual 3D model is loaded separately below.
// ══════════════════════════════════════════════════
function registerNPC(data) {
  const g = new THREE.Group();

  // Aura ring (ground glow)
  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 1.1, 24),
    new THREE.MeshBasicMaterial({ color: 0xC026D3, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.05;
  g.add(auraRing);
  g._auraRing = auraRing;

  // Aura point light
  const auraLight = new THREE.PointLight(0xC026D3, 1.5, 4);
  auraLight.position.y = 1.0;
  g.add(auraLight);
  g._auraLight = auraLight;

  // Sick sprite
  const sickSp = makeTextSprite('😷 !', '#ff4444');
  sickSp.position.set(0, 2.4, 0);
  g.add(sickSp);
  g._sickSprite = sickSp;

  // Healed sprite
  const healSp = makeTextSprite('✅', '#22ff88');
  healSp.position.set(0, 2.4, 0);
  healSp.visible = false;
  g.add(healSp);
  g._healSprite = healSp;

  // Core state
  g._state     = 'sick';
  g._bobOffset = Math.random() * Math.PI * 2;
  g._walkPhase = Math.random() * Math.PI * 2;
  g._walkSpeed = 1.8 + Math.random() * 0.8;

  // Leg refs — will point to GLB bones/meshes after model loads,
  // used by walk animation. Initialised as null so tickNPCMovement
  // safely skips leg swing until model is ready.
  g._legL = null;
  g._legR = null;

  g.position.set(data.pos.x, 0.0, data.pos.z);
  scene.add(g);

  // ── Movement behaviour AI ──
  const beh = data.behaviour || { type: 'stay' };
  g._beh = Object.assign({}, beh);

  if (beh.type === 'wander') {
    g._beh.homeX     = data.pos.x;
    g._beh.homeZ     = data.pos.z;
    g._beh.targetX   = data.pos.x;
    g._beh.targetZ   = data.pos.z;
    g._beh.moving    = false;
    g._beh.waitTimer = 1.5 + Math.random() * 2;
    g._beh.speed     = 1.0 + Math.random() * 0.5;
  }

  if (beh.type === 'patrol') {
    g._beh.wpIndex   = 0;
    g._beh.moving    = false;
    g._beh.waitTimer = 1.0 + Math.random() * 1.5;
    g._beh.speed     = 1.1 + Math.random() * 0.4;
  }

  npcObjects[data.id] = { group: g, data };
}

// Register all NPCs (group + lights + sprites + AI state)
NPCS_DATA.forEach(registerNPC);

// ══════════════════════════════════════════════════
// LOAD GLB MODEL INTO EXISTING NPC GROUP
// Replaces nothing — just adds the 3D model into
// the group that already has lights + sprites.
// ══════════════════════════════════════════════════
function loadNPCModelFromURL(npcId, url, targetH) {
  targetH = targetH || 1.7;

  const entry = npcObjects[npcId];
  if (!entry) {
    console.warn('loadNPCModelFromURL: unknown NPC id "' + npcId + '"');
    return;
  }

  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    const model = gltf.scene;

    // Scale to targetH
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    model.scale.setScalar(targetH / size.y);

    // Sit on ground (y=0 of group)
    const bbox2 = new THREE.Box3().setFromObject(model);
    model.position.y = -bbox2.min.y;

    model.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    entry.group.add(model);
    entry.group._model = model;

    // Try to find leg meshes by name for walk animation.
    // If your GLB has bones/meshes named "leg_l" / "leg_r" (or similar)
    // they will be wired up automatically. Otherwise leg swing is skipped.
    model.traverse(child => {
      const n = child.name.toLowerCase();
      if (!entry.group._legL && (n.includes('leg_l') || n.includes('legl') || n.includes('left_leg')))  entry.group._legL = child;
      if (!entry.group._legR && (n.includes('leg_r') || n.includes('legr') || n.includes('right_leg'))) entry.group._legR = child;
    });

    // Raise sprites above model height
    const spriteY = targetH + 0.6;
    entry.group._sickSprite.position.y  = spriteY;
    entry.group._healSprite.position.y  = spriteY;
    entry.group._auraLight.position.y   = targetH * 0.6;

    console.log('✅ NPC GLB loaded: ' + npcId);
  }, undefined, (err) => {
    console.warn('❌ NPC GLB load error for ' + npcId + ':', err);
  });
}

// ══════════════════════════════════════════════════
// LOAD YOUR GLB MODELS HERE
// Add one line per NPC that has a GLB file.
// NPCs without a loadNPCModelFromURL call will still
// work (aura + sprites visible) — just no 3D mesh.
// ══════════════════════════════════════════════════
loadNPCModelFromURL('badang',  './models/badang.glb');
loadNPCModelFromURL('nenek',   './models/nenek.glb');
loadNPCModelFromURL('pakpandir','./models/pakpandir.glb');
loadNPCModelFromURL('siti',    './models/siti.glb');
loadNPCModelFromURL('ali',     './models/ali.glb');
loadNPCModelFromURL('mak',     './models/mak.glb');
loadNPCModelFromURL('wak',     './models/wak.glb');
loadNPCModelFromURL('tok',     './models/tok.glb');
loadNPCModelFromURL('puteri',  './models/puteri.glb');

// ══════════════════════════════════════════════════
// TICK MOVEMENT  —  called every frame from loop.js
// ══════════════════════════════════════════════════
function tickNPCMovement(dt) {
  Object.values(npcObjects).forEach(({ group }) => {
    const beh = group._beh;
    if (!beh || beh.type === 'stay') return;

    // ══ WANDER ══════════════════════════════════
    if (beh.type === 'wander') {
      if (!beh.moving) {
        beh.waitTimer -= dt;
        if (beh.waitTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const dist  = 2 + Math.random() * beh.radius;
          beh.targetX = beh.homeX + Math.cos(angle) * dist;
          beh.targetZ = beh.homeZ + Math.sin(angle) * dist;
          beh.targetX = Math.max(-WORLD + 2, Math.min(WORLD - 2, beh.targetX));
          beh.targetZ = Math.max(-WORLD + 2, Math.min(WORLD - 2, beh.targetZ));
          beh.moving  = true;
        }
      } else {
        const dx   = beh.targetX - group.position.x;
        const dz   = beh.targetZ - group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.3) {
          beh.moving    = false;
          beh.waitTimer = 2.5 + Math.random() * 3;
          // Ease legs to rest if available
          if (group._legL) group._legL.rotation.x *= 0.7;
          if (group._legR) group._legR.rotation.x *= 0.7;
        } else {
          group.position.x += (dx / dist) * beh.speed * dt;
          group.position.z += (dz / dist) * beh.speed * dt;
          group.rotation.y  = Math.atan2(dx, dz);
          // Walk animation if leg meshes found
          if (group._legL && group._legR) {
            group._walkPhase += dt * group._walkSpeed * 4.5;
            group._legL.rotation.x =  Math.sin(group._walkPhase) * 0.5;
            group._legR.rotation.x = -Math.sin(group._walkPhase) * 0.5;
          }
        }
      }
    }

    // ══ PATROL ══════════════════════════════════
    if (beh.type === 'patrol') {
      const wps = beh.waypoints;
      if (!wps || wps.length < 2) return;

      if (!beh.moving) {
        beh.waitTimer -= dt;
        if (beh.waitTimer <= 0) {
          beh.wpIndex = (beh.wpIndex + 1) % wps.length;
          beh.moving  = true;
        }
      } else {
        const wp   = wps[beh.wpIndex];
        const dx   = wp.x - group.position.x;
        const dz   = wp.z - group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.4) {
          beh.moving    = false;
          beh.waitTimer = 1.5 + Math.random() * 2;
          if (group._legL) group._legL.rotation.x *= 0.7;
          if (group._legR) group._legR.rotation.x *= 0.7;
        } else {
          group.position.x += (dx / dist) * beh.speed * dt;
          group.position.z += (dz / dist) * beh.speed * dt;
          group.rotation.y  = Math.atan2(dx, dz);
          if (group._legL && group._legR) {
            group._walkPhase += dt * group._walkSpeed * 4.5;
            group._legL.rotation.x =  Math.sin(group._walkPhase) * 0.5;
            group._legR.rotation.x = -Math.sin(group._walkPhase) * 0.5;
          }
        }
      }
    }

    // Ease leg swing to rest when standing
    if (!beh.moving) {
      if (group._legL) group._legL.rotation.x *= 0.88;
      if (group._legR) group._legR.rotation.x *= 0.88;
    }
  });
}
