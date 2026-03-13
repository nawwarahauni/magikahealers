// ═══════════════════════════════════════════════════
// js/world.js  —  Scene setup, lighting, environment
// OPTIMISED: fewer lights, cheaper shadows, enhanced environment
// ═══════════════════════════════════════════════════
'use strict';

// ── Renderer & Scene ──
const canvas3d = document.getElementById('c3d');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.0)); // cap at 1x — biggest single win
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false; // shadows disabled — massive GPU saving
renderer.setClearColor(0x0a0418, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0418, 30, 90); // linear fog is cheaper than FogExp2

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 2.8, 0);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Lighting ──
scene.add(new THREE.AmbientLight(0x2a1a4a, 2.5)); // bumped slightly to compensate for no shadows

const sun = new THREE.DirectionalLight(0xfff4cc, 1.4);
sun.position.set(10, 20, 10);
sun.castShadow = false; // no shadow casting
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
fillLight.position.set(-10, 5, -5);
scene.add(fillLight);

// ── World Size ──
const WORLD = 60;

// ── Ground ──
const groundGeo = new THREE.PlaneGeometry(WORLD * 2, WORLD * 2, 4, 4); // 4x4 instead of 60x60
const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d6020 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ── Paths ──
function addPath(x, z, w, d) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.05, d),
    new THREE.MeshLambertMaterial({ color: 0xc8a878 })
  );
  m.position.set(x, 0.01, z);
  m.receiveShadow = true;
  scene.add(m);
}
addPath(0, 0, 3, WORLD * 2);
addPath(0, 0, WORLD * 2, 3);
addPath(-30, -15, 2, 30); addPath( 30, -15, 2, 30);
addPath(-30,  15, 2, 30); addPath( 30,  15, 2, 30);
addPath(-15, -30, 30, 2); addPath( 15, -30, 30, 2);
addPath(-15,  30, 30, 2); addPath( 15,  30, 30, 2);

// ── Water border ──
function addWater(x, z, w, d) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.3, d),
    new THREE.MeshLambertMaterial({ color: 0x3878c8, transparent: true, opacity: 0.85 })
  );
  m.position.set(x, -0.1, z);
  scene.add(m);
}
const bw = WORLD * 2 + 2, bt = 2;
addWater(0,        -WORLD-1, bw, bt);
addWater(0,         WORLD+1, bw, bt);
addWater(-WORLD-1, 0,        bt, bw);
addWater( WORLD+1, 0,        bt, bw);

// ── Helper: simple box mesh ──
function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

// ── House builder ──
function buildHouse(x, z, wallColor, roofColor) {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 4),
    new THREE.MeshLambertMaterial({ color: wallColor })
  );
  walls.position.y = 1.5;
  g.add(walls);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 2, 4),
    new THREE.MeshLambertMaterial({ color: roofColor })
  );
  roof.position.y = 4; roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.5, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x6a3a1a })
  );
  door.position.set(0, 0.75, 2.05);
  g.add(door);
  [-1.2, 1.2].forEach(ox => {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x88ccff, emissive: 0x224466 })
    );
    win.position.set(ox, 1.8, 2.05);
    g.add(win);
  });
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 5, 5),
    new THREE.MeshBasicMaterial({ color: 0xffe88a })
  );
  lamp.position.set(0, 2.6, 2.1);
  g.add(lamp);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

function loadHouseGLB(url, x, z, scale) {
  scale = scale || 1;
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    const model = gltf.scene;
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    model.scale.setScalar((6 / size.y) * scale);
    const bbox2 = new THREE.Box3().setFromObject(model);
    model.position.y = -bbox2.min.y;
    const group = new THREE.Group();
    group.add(model);
    group.position.set(x, 0, z);
    scene.add(group);
  }, undefined, (err) => {
    const wc = [0xc87850,0xb06840,0xd09060,0xb87848,0xa87030,0xcc9060,0xb06030,0xd08050,0xc07040,0xa86830,0xbc7848,0xd49060];
    const rc = [0xe84040,0xc03030,0xe05020,0xd03838,0xcc3030,0xdc4020,0xb02828,0xe03828,0xc83030,0xd44020,0xe04030,0xcc2828];
    const idx = Math.abs(Math.round(x + z)) % 12;
    buildHouse(x, z, wc[idx], rc[idx]);
  });
}

loadHouseGLB('./models/house.glb', -12, -12);
loadHouseGLB('./models/house.glb',  12, -12);
loadHouseGLB('./models/house.glb', -12,  12);
loadHouseGLB('./models/house.glb',  12,  12);
loadHouseGLB('./models/house.glb', -32, -32);
loadHouseGLB('./models/house.glb',   0, -38);
loadHouseGLB('./models/house.glb',  32, -32);


// ── Tree builder & loader ──
function buildTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 1.8, 5),
    new THREE.MeshLambertMaterial({ color: 0x6a3a1a })
  );
  trunk.position.y = 0.9;
  g.add(trunk);
  [[0,2.4,0,1.1],[0,3.3,0,0.8],[0,4.0,0,0.55]].forEach(([lx,ly,lz,r]) => {
    const layer = new THREE.Mesh(
      new THREE.ConeGeometry(r * 1.5, r * 1.8, 5),
      new THREE.MeshLambertMaterial({ color: 0x2a6e1a })
    );
    layer.position.set(lx, ly, lz);
    g.add(layer);
  });
  g.position.set(x, 0, z);
  g._sway = Math.random() * Math.PI * 2;
  scene.add(g);
  return g;
}

const trees = [
   [-58,-58],[-48,-58],[-36,-58],[-20,-58],[0,-58],[20,-58],[36,-58],[48,-58],[58,-58],
  [-58, 58],[-48, 58],[-36, 58],[-20, 58],[0, 58],[20, 58],[36, 58],[48, 58],[58, 58],
  [-58,-48],[-58,-36],[-58,-20],[-58, 0],[-58,20],[-58,36],[-58,48],
  [ 58,-48],[ 58,-36],[ 58,-20],[ 58, 0],[ 58,20],[ 58,36],[ 58,48],
  [-40,-15],[40,15],[-15,-40],[15,40],
  [-44, 10],[44,-10],[10,-44],[-10,44],
  [-30,-44],[30,44],[-44,30],[44,-30],
  [-22, 46],[22,-46],[-46,22],[46,-22],
  [-35,  5],[35, -5],[ -5,-35],[ 5, 35]
];


// ── Wells ──
function buildWell(x, z) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1, 0.8, 12),
    new THREE.MeshLambertMaterial({ color: 0x888898 })
  );
  base.position.y = 0.4; g.add(base);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12),
    new THREE.MeshLambertMaterial({ color: 0x4090e0, transparent: true, opacity: 0.9 })
  );
  water.position.y = 0.75; g.add(water);
  [-0.7, 0.7].forEach(ox => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.6, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x6a3a1a })
    );
    post.position.set(ox, 1.2, 0); g.add(post);
  });
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.12, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x5a2a10 })
  );
  beam.position.y = 2.0; g.add(beam);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 0.6, 4),
    new THREE.MeshLambertMaterial({ color: 0xe84040 })
  );
  roof.position.y = 2.5; roof.rotation.y = Math.PI / 4; g.add(roof);
  g.position.set(x, 0, z);
  scene.add(g);
}
buildWell(0, 0); buildWell(-25, 0); buildWell(25, 0);
buildWell(0, -25); buildWell(0, 25);

// ── Market stalls ──
function buildStall(x, z, color) {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.8, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x8a5a28 })
  );
  counter.position.y = 0.4; g.add(counter);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.1, 1.8),
    new THREE.MeshLambertMaterial({ color })
  );
  awning.position.set(0, 1.8, -0.2); g.add(awning);
  [[-1.6, 0.9], [1.6, 0.9]].forEach(([ox, oz]) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5),
      new THREE.MeshLambertMaterial({ color: 0x6a3a1a })
    );
    pole.position.set(ox, 0.9, oz); g.add(pole);
  });
  g.position.set(x, 0, z);
  scene.add(g);
}
buildStall(-5, -6, 0xee4444); buildStall( 5, -6, 0x44aaee);
buildStall(-5,  6, 0xeeaa22); buildStall( 5,  6, 0x22ee88);
buildStall(-20,-3, 0xcc44aa); buildStall(20,  3, 0x44ccee);

// ── Rocks ──
[[-18,-6],[18,6],[-18,12],[10,-18],[-36,-15],[36,15],[-10,-42],[42,10],
 [-28,36],[28,-36],[16,42],[-42,-20]].forEach(([x, z]) => {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0x8a8a9a })
  );
  rock.position.set(x, 0.4, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(rock);
});

// ── Flowers (merged into 2 meshes — stems + blooms) ──
const flowerData = [
  [-5,-15,'#ff6090'],[5,-15,'#ffcc00'],[-15,5,'#ff9040'],[15,5,'#ff6090'],[0,-18,'#ccffaa'],
  [-30,10,'#ff88cc'],[30,-10,'#88ffcc'],[-10,30,'#ffaa44'],[10,-30,'#44aaff'],
  [-22,-22,'#88ccff'],[22,22,'#ffcc88'],[-22,22,'#ff88aa'],[22,-22,'#88ffaa'],
  [-40,5,'#ff6090'],[40,-5,'#ffcc00'],[-5,-40,'#ccffaa'],[5,40,'#ff9040']
];
// Stems: one merged mesh
const stemGeoBase = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4);
const stemMat = new THREE.MeshLambertMaterial({ color: 0x2a8a2a });
flowerData.forEach(([x, z]) => {
  const s = new THREE.Mesh(stemGeoBase, stemMat);
  s.position.set(x, 0.25, z);
  scene.add(s);
});
// Blooms: one merged mesh per color group (simplified: share one geometry)
const bloomGeoBase = new THREE.SphereGeometry(0.2, 4, 4); // 4 segs instead of 6
flowerData.forEach(([x, z, col]) => {
  const bloom = new THREE.Mesh(
    bloomGeoBase,
    new THREE.MeshLambertMaterial({ color: parseInt(col.replace('#', '0x')) })
  );
  bloom.position.set(x, 0.6, z);
  scene.add(bloom);
});


// ── Stars (2 layers, reduced counts) ──
const starGeo1 = new THREE.BufferGeometry();
const sPos1 = new Float32Array(150 * 3);
for (let i = 0; i < 150*3; i += 3) {
  sPos1[i]   = (Math.random() - 0.5) * 600;
  sPos1[i+1] = 25 + Math.random() * 80;
  sPos1[i+2] = (Math.random() - 0.5) * 600;
}
starGeo1.setAttribute('position', new THREE.BufferAttribute(sPos1, 3));
const starMat1 = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 1.0 });
scene.add(new THREE.Points(starGeo1, starMat1));

const starGeo2 = new THREE.BufferGeometry();
const sPos2 = new Float32Array(250 * 3);
for (let i = 0; i < 250*3; i += 3) {
  sPos2[i]   = (Math.random() - 0.5) * 600;
  sPos2[i+1] = 20 + Math.random() * 100;
  sPos2[i+2] = (Math.random() - 0.5) * 600;
}
starGeo2.setAttribute('position', new THREE.BufferAttribute(sPos2, 3));
const starMat2 = new THREE.PointsMaterial({ color: 0xffeedd, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.9 });
scene.add(new THREE.Points(starGeo2, starMat2));

const allStarMats = [starMat1, starMat2];

// ── Lamp post system ──
// 8 shared zone lights cover the whole map (instead of 32 individual PointLights)
const _lampZoneLights = [];
[[-15,-15],[15,-15],[-15,15],[15,15],[-30,0],[30,0],[0,-30],[0,30]].forEach(([x, z]) => {
  const zl = new THREE.PointLight(0xffcc66, 0, 20);
  zl.position.set(x, 3.5, z);
  scene.add(zl);
  _lampZoneLights.push(zl);
});

const LAMP_POSITIONS = [
  { x:  1.8, z: -18 }, { x:  1.8, z: -12 }, { x:  1.8, z:  -6 },
  { x:  1.8, z:   6 }, { x:  1.8, z:  12 }, { x:  1.8, z:  18 },
  { x:  1.8, z: -30 }, { x:  1.8, z:  30 },
  { x: -18, z:  1.8 }, { x: -12, z:  1.8 }, { x:  -6, z:  1.8 },
  { x:   6, z:  1.8 }, { x:  12, z:  1.8 }, { x:  18, z:  1.8 },
  { x: -30, z:  1.8 }, { x:  30, z:  1.8 },
  { x: -10, z: -12 }, { x: -14, z: -10 },
  { x:  10, z: -12 }, { x:  14, z: -10 },
  { x: -10, z:  12 }, { x: -14, z:  10 },
  { x:  10, z:  12 }, { x:  14, z:  10 },
  { x: -30, z: -30 }, { x:  30, z: -30 },
  { x: -30, z:  30 }, { x:  30, z:  30 },
  { x:   0, z: -36 }, { x:   0, z:  36 },
  { x: -36, z:   0 }, { x:  36, z:   0 },
];

const lampObjects = [];

function buildFallbackLamp(x, z, zoneIdx) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x444455 })
  );
  pole.position.y = 1.75;
  g.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffeeaa })
  );
  head.position.y = 3.6;
  g.add(head);
  g.position.set(x, 0, z);
  scene.add(g);
  lampObjects.push({ group: g, light: _lampZoneLights[zoneIdx % _lampZoneLights.length], glow: head });
}
function loadLampGLB(url) {
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    LAMP_POSITIONS.forEach(({ x, z }, idx) => {
      const group = new THREE.Group();
      const bamboo = 0xc8880a; // golden bamboo colour
      const cageMat = new THREE.MeshLambertMaterial({ color: bamboo });

      // ── 1. Tall bamboo stick ──
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6),
        cageMat
      );
      stick.position.y = 1.1;
      group.add(stick);

      // ── 2. Cage / basket holder (4 vertical bars + 3 rings) ──
      const cageY = 2.2;   // top of stick
      const cageH = 0.55;  // cage height
      const cageR = 0.13;  // cage radius

      // 4 vertical cage bars
      [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach(angle => {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, cageH, 4),
          cageMat
        );
        bar.position.set(
          Math.cos(angle) * cageR,
          cageY + cageH / 2,
          Math.sin(angle) * cageR
        );
        group.add(bar);
      });

      // Top ring
      const ringTop = new THREE.Mesh(
        new THREE.TorusGeometry(cageR, 0.025, 4, 12),
        cageMat
      );
      ringTop.rotation.x = Math.PI / 2;
      ringTop.position.y = cageY + cageH;
      group.add(ringTop);

      // Bottom ring
      const ringBot = new THREE.Mesh(
        new THREE.TorusGeometry(cageR, 0.025, 4, 12),
        cageMat
      );
      ringBot.rotation.x = Math.PI / 2;
      ringBot.position.y = cageY;
      group.add(ringBot);

      // Mid ring
      const ringMid = new THREE.Mesh(
        new THREE.TorusGeometry(cageR, 0.02, 4, 12),
        cageMat
      );
      ringMid.rotation.x = Math.PI / 2;
      ringMid.position.y = cageY + cageH * 0.5;
      group.add(ringMid);

      // ── 3. Pelita GLB inside the cage ──
      const model = gltf.scene.clone(true);
      const bbox = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      model.scale.setScalar(0.42 / size.y);
      const bbox2 = new THREE.Box3().setFromObject(model);
      model.position.y = -(bbox2.min.y) + cageY + 0.02;
      group.add(model);

      // ── 4. Flame at top ──
      const glow = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.18, 5),
        new THREE.MeshBasicMaterial({ color: 0xffdd00 })
      );
      glow.position.y = cageY + cageH + 0.14;
      group.add(glow);

      const flameOuter = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.22, 5),
        new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 })
      );
      flameOuter.position.y = cageY + cageH + 0.12;
      group.add(flameOuter);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.25 })
      );
      halo.position.y = cageY + cageH + 0.08;
      group.add(halo);

      group.position.set(x, 0, z);
      scene.add(group);

      lampObjects.push({ group, light: _lampZoneLights[idx % _lampZoneLights.length], glow });
    });
  }, undefined, () => {
    LAMP_POSITIONS.forEach(({ x, z }, idx) => buildFallbackLamp(x, z, idx));
  });
}
loadLampGLB('./models/pelita.glb');

// ── Magic particles (reduced to 50) ──
const mpGeo = new THREE.BufferGeometry();
const mpPos = new Float32Array(50 * 3);
const mpVel = [];
for (let i = 0; i < 50; i++) {
  mpPos[i*3]   = (Math.random() - 0.5) * 50;
  mpPos[i*3+1] = Math.random() * 6;
  mpPos[i*3+2] = (Math.random() - 0.5) * 50;
  mpVel.push({
    x: (Math.random() - 0.5) * 0.02,
    y: 0.01 + Math.random() * 0.02,
    z: (Math.random() - 0.5) * 0.02,
  });
}
mpGeo.setAttribute('position', new THREE.BufferAttribute(mpPos, 3));
const mpMesh = new THREE.Points(mpGeo, new THREE.PointsMaterial({
  color: 0x8B5CF6, size: 0.12, transparent: true, opacity: 0.7, sizeAttenuation: true
}));
scene.add(mpMesh);

// ── Enhanced environment: ritual circle & distant mountains ──
const ritualRing = new THREE.Mesh(
  new THREE.TorusGeometry(2.5, 0.06, 6, 48),
  new THREE.MeshBasicMaterial({ color: 0xC026D3, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false })
);
ritualRing.rotation.x = -Math.PI / 2;
ritualRing.position.y = 0.04;
scene.add(ritualRing);

const ritualRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(1.4, 0.04, 6, 36),
  new THREE.MeshBasicMaterial({ color: 0x8B5CF6, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false })
);
ritualRing2.rotation.x = -Math.PI / 2;
ritualRing2.position.y = 0.03;
scene.add(ritualRing2);

window._ritualRings = [ritualRing, ritualRing2];

// Distant mountain silhouettes
const mtHeights = [18,24,20,16,22,19,26,15,21];
const mtColors  = [0x1a1030, 0x251540, 0x1c1228];
for (let side = 0; side < 3; side++) {
  mtHeights.forEach((h, idx) => {
    const sh   = h * (0.8 + side * 0.2);
    const ang  = (side / 3) * Math.PI * 2 + idx * 0.3;
    const mtn  = new THREE.Mesh(
      new THREE.ConeGeometry(sh * 0.7, sh, 5),
      new THREE.MeshLambertMaterial({ color: mtColors[side] })
    );
    mtn.position.set(Math.cos(ang) * 95, sh * 0.5 - 2, Math.sin(ang) * 95);
    mtn.rotation.y = Math.random() * Math.PI;
    scene.add(mtn);
  });
}

// Fireflies (reduced to 30)
const ffCount = 30;
const ffGeo   = new THREE.BufferGeometry();
const ffPos2  = new Float32Array(ffCount * 3);
const ffVel   = [];
const ffPhase = [];
for (let i = 0; i < ffCount; i++) {
  const ang = Math.random() * Math.PI * 2;
  const r   = 5 + Math.random() * 28;
  ffPos2[i*3]   = Math.cos(ang) * r;
  ffPos2[i*3+1] = 0.3 + Math.random() * 1.8;
  ffPos2[i*3+2] = Math.sin(ang) * r;
  ffVel.push({ x:(Math.random()-0.5)*0.012, y:(Math.random()-0.5)*0.006, z:(Math.random()-0.5)*0.012 });
  ffPhase.push(Math.random() * Math.PI * 2);
}
ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos2, 3));
const ffMesh = new THREE.Points(ffGeo, new THREE.PointsMaterial({
  color: 0xaaff88, size: 0.18, transparent: true, opacity: 0.0,
  sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(ffMesh);
window._ffData = { geo: ffGeo, pos: ffPos2, vel: ffVel, phase: ffPhase, mesh: ffMesh };
