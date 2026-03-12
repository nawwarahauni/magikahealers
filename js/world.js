// ═══════════════════════════════════════════════════
// js/world.js  —  Scene setup, lighting, environment
// MERGED: GLB tree/keris loaders + expanded world (WORLD=60)
// ═══════════════════════════════════════════════════
'use strict';

// ── Renderer & Scene ──
const canvas3d = document.getElementById('c3d');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0a0418, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0418, 0.018); // lighter fog = bigger feel

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 2.8, 0);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Lighting ──
scene.add(new THREE.AmbientLight(0x2a1a4a, 2));

const sun = new THREE.DirectionalLight(0xfff4cc, 1.4);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far  = 200;
sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
sun.shadow.camera.right = sun.shadow.camera.top   =  80;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
fillLight.position.set(-10, 5, -5);
scene.add(fillLight);

// ── World Size ──
const WORLD = 60;

// ── Ground ──
const groundGeo = new THREE.PlaneGeometry(WORLD * 2, WORLD * 2, 60, 60);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a7a28 });
const gPosArr = groundGeo.attributes.position.array;
const colors  = new Float32Array(gPosArr.length);
for (let i = 0; i < gPosArr.length; i += 3) {
  const v = 0.7 + Math.random() * 0.3;
  colors[i] = 0.22*v; colors[i+1] = 0.48*v; colors[i+2] = 0.16*v;
}
groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
groundMat.vertexColors = true;
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
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
addPath(0, 0, 3, WORLD * 2);   // N-S main road
addPath(0, 0, WORLD * 2, 3);   // E-W main road
// Paths to outer ring of houses
addPath(-30, -15, 2, 30);
addPath( 30, -15, 2, 30);
addPath(-30,  15, 2, 30);
addPath( 30,  15, 2, 30);
addPath(-15, -30, 30, 2);
addPath( 15, -30, 30, 2);
addPath(-15,  30, 30, 2);
addPath( 15,  30, 30, 2);

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
function box(w, h, d, color, x, y, z, castShadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  m.castShadow    = castShadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// ══════════════════════════════════════════════════
// GLB LOADERS
// ══════════════════════════════════════════════════

// ── House GLB loader (with box fallback) ──
function buildHouse(x, z, wallColor, roofColor) {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 4),
    new THREE.MeshLambertMaterial({ color: wallColor })
  );
  walls.position.y = 1.5; walls.castShadow = true; walls.receiveShadow = true;
  g.add(walls);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 2, 4),
    new THREE.MeshLambertMaterial({ color: roofColor })
  );
  roof.position.y = 4; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
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
    new THREE.SphereGeometry(0.12, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe88a })
  );
  lamp.position.set(0, 2.6, 2.1);
  g.add(lamp);
  const pl = new THREE.PointLight(0xffd06a, 1.2, 5);
  pl.position.set(0, 2.5, 2.2);
  g.add(pl);
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
    model.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const group = new THREE.Group();
    group.add(model);
    group.position.set(x, 0, z);
    scene.add(group);
    console.log('✅ House GLB loaded at', x, z);
  }, undefined, (err) => {
    console.warn('❌ House GLB load error:', err);
    const wc = [0xc87850,0xb06840,0xd09060,0xb87848,0xa87030,0xcc9060,0xb06030,0xd08050,0xc07040,0xa86830,0xbc7848,0xd49060];
    const rc = [0xe84040,0xc03030,0xe05020,0xd03838,0xcc3030,0xdc4020,0xb02828,0xe03828,0xc83030,0xd44020,0xe04030,0xcc2828];
    const idx = Math.abs(Math.round(x + z)) % 12;
    buildHouse(x, z, wc[idx], rc[idx]);
  });
}

// Central 4 houses
loadHouseGLB('./models/house.glb', -12, -12);
loadHouseGLB('./models/house.glb',  12, -12);
loadHouseGLB('./models/house.glb', -12,  12);
loadHouseGLB('./models/house.glb',  12,  12);
// Outer ring — 8 more houses
loadHouseGLB('./models/house.glb', -32, -32);
loadHouseGLB('./models/house.glb',   0, -38);
loadHouseGLB('./models/house.glb',  32, -32);
loadHouseGLB('./models/house.glb',  38,   0);
loadHouseGLB('./models/house.glb',  32,  32);
loadHouseGLB('./models/house.glb',   0,  38);
loadHouseGLB('./models/house.glb', -32,  32);
loadHouseGLB('./models/house.glb', -38,   0);

// ── Tree GLB loader (with box-tree fallback) ──
function buildTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 1.8, 7),
    new THREE.MeshLambertMaterial({ color: 0x6a3a1a })
  );
  trunk.position.y = 0.9; trunk.castShadow = true;
  g.add(trunk);
  [[0,2.4,0,1.1],[0,3.3,0,0.8],[0,4.0,0,0.55]].forEach(([lx,ly,lz,r]) => {
    const layer = new THREE.Mesh(
      new THREE.ConeGeometry(r * 1.5, r * 1.8, 7),
      new THREE.MeshLambertMaterial({ color: 0x2a6e1a + (Math.random() * 0x101010 | 0) })
    );
    layer.position.set(lx, ly, lz); layer.castShadow = true;
    g.add(layer);
  });
  g.position.set(x, 0, z);
  g._sway = Math.random() * Math.PI * 2;
  scene.add(g);
  return g;
}

// Track fallback trees for sway animation
const trees = [];

function loadtreeGLB(url, x, z, scale) {
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
    model.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const group = new THREE.Group();
    group.add(model);
    group.position.set(x, 0, z);
    group._sway = Math.random() * Math.PI * 2;
    scene.add(group);
    trees.push(group);
    console.log('✅ Tree GLB loaded at', x, z);
  }, undefined, (err) => {
    console.warn('❌ Tree GLB load error — using fallback:', err);
    trees.push(buildTree(x, z));
  });
}

// ── Traditional object GLB loader ──
function loadtraditionalobject(url, x, z, scale) {
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
    model.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const group = new THREE.Group();
    group.add(model);
    group.position.set(x, 0, z);
    scene.add(group);
    console.log('✅ Traditional Object GLB loaded at', x, z);
  }, undefined, (err) => {
    console.warn('❌ Traditional Object GLB load error:', err);
  });
}

// ── Place trees — inner ring (GLB) + outer ring (GLB with fallback) ──
// Inner ring — same positions as original doc 6
loadtreeGLB('./models/tree (1).glb', -24, -24);
loadtreeGLB('./models/tree (1).glb', -20, -24);
loadtreeGLB('./models/tree (1).glb', -16, -24);
loadtreeGLB('./models/tree (1).glb',  16, -24);
loadtreeGLB('./models/tree (1).glb',  20, -24);
loadtreeGLB('./models/tree (1).glb',  24, -24);

loadtreeGLB('./models/tree (1).glb', -24,  24);
loadtreeGLB('./models/tree (1).glb', -20,  24);
loadtreeGLB('./models/tree (1).glb', -16,  24);
loadtreeGLB('./models/tree (1).glb',  16,  24);
loadtreeGLB('./models/tree (1).glb',  20,  24);
loadtreeGLB('./models/tree (1).glb',  24,  24);

loadtreeGLB('./models/tree (1).glb', -24,  -8);
loadtreeGLB('./models/tree (1).glb', -24,   0);
loadtreeGLB('./models/tree (1).glb', -24,   8);
loadtreeGLB('./models/tree (1).glb',  24,  -8);
loadtreeGLB('./models/tree (1).glb',  24,   0);
loadtreeGLB('./models/tree (1).glb',  24,   8);

loadtreeGLB('./models/tree (1).glb', -18, -18);
loadtreeGLB('./models/tree (1).glb',  18, -18);
loadtreeGLB('./models/tree (1).glb', -18,  18);
loadtreeGLB('./models/tree (1).glb',  18,  18);

loadtreeGLB('./models/tree (1).glb',  -6, -20);
loadtreeGLB('./models/tree (1).glb',   6, -20);
loadtreeGLB('./models/tree (1).glb',  -6,  20);
loadtreeGLB('./models/tree (1).glb',   6,  20);

// Outer perimeter wall of trees (from doc 7 — these use fallback if GLB fails)
const OUTER_TREE_POSITIONS = [
  [-58,-58],[-48,-58],[-36,-58],[-20,-58],[0,-58],[20,-58],[36,-58],[48,-58],[58,-58],
  [-58, 58],[-48, 58],[-36, 58],[-20, 58],[0, 58],[20, 58],[36, 58],[48, 58],[58, 58],
  [-58,-48],[-58,-36],[-58,-20],[-58, 0],[-58,20],[-58,36],[-58,48],
  [ 58,-48],[ 58,-36],[ 58,-20],[ 58, 0],[ 58,20],[ 58,36],[ 58,48],
  // Mid-field clusters
  [-40,-15],[40,15],[-15,-40],[15,40],
  [-44, 10],[44,-10],[10,-44],[-10,44],
  [-30,-44],[30,44],[-44,30],[44,-30],
  [-22, 46],[22,-46],[-46,22],[46,-22],
  [-35,  5],[35, -5],[ -5,-35],[ 5, 35],
];
OUTER_TREE_POSITIONS.forEach(([x, z]) => {
  loadtreeGLB('./models/tree (1).glb', x, z);
});

// ── Traditional objects ──
loadtraditionalobject('./models/keris.glb', -5, -1);

// ══════════════════════════════════════════════════
// ENVIRONMENT OBJECTS
// ══════════════════════════════════════════════════

// ── Wells ──
function buildWell(x, z) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1, 0.8, 12),
    new THREE.MeshLambertMaterial({ color: 0x888898 })
  );
  base.position.y = 0.4; base.castShadow = true;
  g.add(base);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12),
    new THREE.MeshLambertMaterial({ color: 0x4090e0, transparent: true, opacity: 0.9 })
  );
  water.position.y = 0.75;
  g.add(water);
  [-0.7, 0.7].forEach(ox => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.6, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x6a3a1a })
    );
    post.position.set(ox, 1.2, 0); post.castShadow = true;
    g.add(post);
  });
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.12, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x5a2a10 })
  );
  beam.position.y = 2.0; beam.castShadow = true;
  g.add(beam);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 0.6, 4),
    new THREE.MeshLambertMaterial({ color: 0xe84040 })
  );
  roof.position.y = 2.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  g.add(roof);
  g.position.set(x, 0, z);
  scene.add(g);
}
buildWell(0,    0);   // centre
buildWell(-25,  0);   // west
buildWell( 25,  0);   // east
buildWell(  0, -25);  // south
buildWell(  0,  25);  // north

// ── Market stalls ──
function buildStall(x, z, color) {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.8, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x8a5a28 })
  );
  counter.position.y = 0.4; counter.castShadow = true; g.add(counter);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.1, 1.8),
    new THREE.MeshLambertMaterial({ color })
  );
  awning.position.set(0, 1.8, -0.2); awning.castShadow = true; g.add(awning);
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
buildStall(-5,  -6, 0xee4444);
buildStall( 5,  -6, 0x44aaee);
buildStall(-5,   6, 0xeeaa22);
buildStall( 5,   6, 0x22ee88);
buildStall(-20, -3, 0xcc44aa);
buildStall( 20,  3, 0x44ccee);

// ── Rocks ──
[[-18,-6],[18,6],[-18,12],[10,-18],
 [-36,-15],[36,15],[-10,-42],[42,10],
 [-28,36],[28,-36],[16,42],[-42,-20]].forEach(([x, z]) => {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0x8a8a9a })
  );
  rock.position.set(x, 0.4, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  scene.add(rock);
});

// ── Flowers ──
[[-5,-15,'#ff6090'],[5,-15,'#ffcc00'],[-15,5,'#ff9040'],[15,5,'#ff6090'],[0,-18,'#ccffaa'],
 [-30,10,'#ff88cc'],[30,-10,'#88ffcc'],[-10,30,'#ffaa44'],[10,-30,'#44aaff'],
 [-22,-22,'#88ccff'],[22,22,'#ffcc88'],[-22,22,'#ff88aa'],[22,-22,'#88ffaa'],
 [-40,5,'#ff6090'],[40,-5,'#ffcc00'],[-5,-40,'#ccffaa'],[5,40,'#ff9040']
].forEach(([x, z, col]) => {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4),
    new THREE.MeshLambertMaterial({ color: 0x2a8a2a })
  );
  stem.position.set(x, 0.25, z);
  scene.add(stem);
  const bloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 6, 6),
    new THREE.MeshLambertMaterial({ color: parseInt(col.replace('#', '0x')) })
  );
  bloom.position.set(x, 0.6, z);
  scene.add(bloom);
});

// ── Fences — inner village ──
function addFence(x1, z1, x2, z2) {
  const dx = x2-x1, dz = z2-z1;
  const len = Math.sqrt(dx*dx + dz*dz);
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.15, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x9a7050 })
  );
  m.position.set((x1+x2)/2, 0.6, (z1+z2)/2);
  m.rotation.y = Math.atan2(dx, dz);
  m.castShadow = true;
  scene.add(m);
}
const FR = 7.5;
for (let i = -FR; i <= FR; i += 2.5) {
  if (Math.abs(i) < 1.8) continue;
  addFence(i, -FR, i+0.1, -FR);
  addFence(i,  FR, i+0.1,  FR);
}
addFence(-FR, -FR,  FR, -FR);
addFence(-FR,  FR,  FR,  FR);
addFence(-FR, -FR, -FR,  FR);
addFence( FR, -FR,  FR,  FR);

// Outer village ring fence
const OR = 22;
for (let i = -OR; i <= OR; i += 3) {
  if (Math.abs(i) < 2) continue;
  addFence(i, -OR, i+0.1, -OR);
  addFence(i,  OR, i+0.1,  OR);
}
addFence(-OR,-OR, OR,-OR); addFence(-OR, OR, OR, OR);
addFence(-OR,-OR,-OR, OR); addFence( OR,-OR, OR, OR);

// ══════════════════════════════════════════════════
// STARS (3 layers)
// ══════════════════════════════════════════════════
const starGeo1 = new THREE.BufferGeometry();
const sPos1 = new Float32Array(600 * 3);
for (let i = 0; i < 600*3; i += 3) {
  sPos1[i]   = (Math.random() - 0.5) * 600;
  sPos1[i+1] = 25 + Math.random() * 80;
  sPos1[i+2] = (Math.random() - 0.5) * 600;
}
starGeo1.setAttribute('position', new THREE.BufferAttribute(sPos1, 3));
const starMat1 = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 1.0 });
const starPoints1 = new THREE.Points(starGeo1, starMat1);
scene.add(starPoints1);

const starGeo2 = new THREE.BufferGeometry();
const sPos2 = new Float32Array(1000 * 3);
for (let i = 0; i < 1000*3; i += 3) {
  sPos2[i]   = (Math.random() - 0.5) * 600;
  sPos2[i+1] = 20 + Math.random() * 100;
  sPos2[i+2] = (Math.random() - 0.5) * 600;
}
starGeo2.setAttribute('position', new THREE.BufferAttribute(sPos2, 3));
const starMat2 = new THREE.PointsMaterial({ color: 0xffeedd, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.9 });
const starPoints2 = new THREE.Points(starGeo2, starMat2);
scene.add(starPoints2);

const starGeo3 = new THREE.BufferGeometry();
const sPos3 = new Float32Array(1500 * 3);
for (let i = 0; i < 1500*3; i += 3) {
  sPos3[i]   = (Math.random() - 0.5) * 600;
  sPos3[i+1] = 15 + Math.random() * 110;
  sPos3[i+2] = (Math.random() - 0.5) * 600;
}
starGeo3.setAttribute('position', new THREE.BufferAttribute(sPos3, 3));
const starMat3 = new THREE.PointsMaterial({ color: 0xaabbff, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.6 });
const starPoints3 = new THREE.Points(starGeo3, starMat3);
scene.add(starPoints3);

// Used by tickStars() in loop.js
const allStarMats = [starMat1, starMat2, starMat3];

// ══════════════════════════════════════════════════
// LAMP POST SYSTEM
// ══════════════════════════════════════════════════
const LAMP_POSITIONS = [
  // N-S road — extended
  { x:  1.8, z: -18 }, { x:  1.8, z: -12 }, { x:  1.8, z:  -6 },
  { x:  1.8, z:   6 }, { x:  1.8, z:  12 }, { x:  1.8, z:  18 },
  { x:  1.8, z: -30 }, { x:  1.8, z:  30 },
  // E-W road — extended
  { x: -18, z:  1.8 }, { x: -12, z:  1.8 }, { x:  -6, z:  1.8 },
  { x:   6, z:  1.8 }, { x:  12, z:  1.8 }, { x:  18, z:  1.8 },
  { x: -30, z:  1.8 }, { x:  30, z:  1.8 },
  // Beside central houses
  { x: -10, z: -12 }, { x: -14, z: -10 },
  { x:  10, z: -12 }, { x:  14, z: -10 },
  { x: -10, z:  12 }, { x: -14, z:  10 },
  { x:  10, z:  12 }, { x:  14, z:  10 },
  // Outer house lamps
  { x: -30, z: -30 }, { x:  30, z: -30 },
  { x: -30, z:  30 }, { x:  30, z:  30 },
  { x:   0, z: -36 }, { x:   0, z:  36 },
  { x: -36, z:   0 }, { x:  36, z:   0 },
];

const lampObjects = []; // used by skymode.js tickSkyMode / tickLamps

function buildFallbackLamp(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x444455 })
  );
  pole.position.y = 1.75; pole.castShadow = true;
  g.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffeeaa })
  );
  head.position.y = 3.6;
  g.add(head);
  const light = new THREE.PointLight(0xffcc66, 1.8, 8);
  light.position.y = 3.6;
  g.add(light);
  g.position.set(x, 0, z);
  scene.add(g);
  lampObjects.push({ group: g, light, glow: head });
}

function loadLampGLB(url) {
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    console.log('Lamp GLB loaded — placing', LAMP_POSITIONS.length, 'lamps');
    LAMP_POSITIONS.forEach(({ x, z }) => {
      const model = gltf.scene.clone(true);
      const bbox = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      model.scale.setScalar(3.5 / size.y);
      const bbox2 = new THREE.Box3().setFromObject(model);
      model.position.y = -bbox2.min.y;
      model.traverse(child => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      const group = new THREE.Group();
      group.add(model);
      group.position.set(x, 0, z);
      scene.add(group);
      const light = new THREE.PointLight(0xffcc66, 2.0, 10);
      light.position.set(x, 3.4, z);
      scene.add(light);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffeeaa })
      );
      glow.position.set(x, 3.5, z);
      scene.add(glow);
      lampObjects.push({ group, light, glow });
    });
  }, undefined, (err) => {
    console.warn('Lamp GLB failed — using fallback poles:', err);
    LAMP_POSITIONS.forEach(({ x, z }) => buildFallbackLamp(x, z));
  });
}
loadLampGLB('./models/floor_lamp.glb');

// ══════════════════════════════════════════════════
// MAGIC PARTICLES
// ══════════════════════════════════════════════════
const mpGeo = new THREE.BufferGeometry();
const mpPos = new Float32Array(300 * 3);
const mpVel = [];
for (let i = 0; i < 300; i++) {
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
  color: 0x8B5CF6, size: 0.1, transparent: true, opacity: 0.7, sizeAttenuation: true
}));
scene.add(mpMesh);
