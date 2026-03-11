# Magika Healers

## ▶ HOW TO RUN (Windows + Python)

### Step 1 — Check Your Folder Structure
Make sure your folder looks exactly like this:
```
📁 magika-healers/
  ├── 📄 index.html
  ├── 📁 css/
  │     └── style.css
  ├── 📁 js/
  │     ├── data.js
  │     ├── world.js
  │     ├── npcs.js
  │     ├── vfx.js
  │     ├── player.js
  │     ├── game.js
  │     ├── hands.js
  │     └── loop.js
  └── 📁 models/
        ├── nenek.glb
        ├── badang.glb
        └── house.glb
```

### Step 2 — Open Command Prompt Inside the Folder
1. Open the `magika-healers` folder in **File Explorer**
2. Click the **address bar** at the top (where it shows the folder path)
3. Type `cmd` and press **Enter**

A black Command Prompt window will open already inside your folder ✅

### Step 3 — Start the Local Server
In the Command Prompt, type:
```
python -m http.server 8000
```
Press **Enter**. You should see:
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```
> ⚠️ Leave this window open — closing it stops the server.

### Step 4 — Open the Game in Browser
Open **Chrome** or **Edge** and go to:
```
http://localhost:8000
```
The game title screen should appear ✅

> ⚠️ Do NOT open index.html by double-clicking it.
> That uses file:// which blocks GLB files from loading.
> Always use http://localhost:8000

### Step 5 — Check That Models Loaded (F12)
Press **F12** in the browser → click the **Console** tab.

You should see:
```
✅ GLB loaded for nenek
✅ GLB loaded for badang
✅ House GLB loaded at -12 -12
```

If you see ❌ red errors, copy the message and ask for help to fix it.

### Every Time You Want to Play
Repeat Steps 2–4. The server only runs while the Command Prompt window is open.

---

## 🎮 HOW TO PLAY
| Action | Key |
|---|---|
| Move | W A S D or Arrow Keys |
| Look around | Mouse |
| Talk to villager | E or Space (when near them) |
| Cast spell (keyboard) | Q = Water, W = Earth, Z = Light, R = Heat |
| Cast spell (hands) | Hold gesture for ~0.7s to charge |

**Goal:** Find all 4 sick villagers, learn their ailment, cast the correct spell combo to heal them!

---

## 📁 FILE STRUCTURE

```
magika-healers/
│
├── index.html          ← Main HTML (just HTML structure + script tags)
│
├── css/
│   └── style.css       ← ALL styling (HUD, dialog, casting, title screen)
│
├── js/
│   ├── data.js         ← SPELLS and NPCS_DATA definitions
│   ├── world.js        ← Scene, renderer, camera, lighting, ground, houses, trees
│   ├── npcs.js         ← buildNPC(), loadNPCModelFromURL(), sick/heal sprites
│   ├── vfx.js          ← fireSpellVFX(), tickVFX() — ring, orbs, heal column
│   ├── player.js       ← pState, pointer lock, keyboard, updatePlayer()
│   ├── game.js         ← handleInteract(), castSpell(), resolveHeal(), UI helpers
│   ├── hands.js        ← MediaPipe hand tracking, gesture → spell mapping
│   └── loop.js         ← animate() render loop (MUST be loaded last)
│
└── models/             ← Put your .glb files here
    ├── nenek.glb
    ├── badang.glb
    └── house.glb
```

### Script Load Order (IMPORTANT)
Scripts must load in this exact order in index.html:
1. `data.js`   — defines SPELLS & NPCS_DATA (used by everything)
2. `world.js`  — creates scene, renderer, camera (used by npcs, vfx, player)
3. `npcs.js`   — needs scene + NPCS_DATA
4. `vfx.js`    — needs scene + mpMesh
5. `player.js` — needs scene + camera + npcObjects
6. `game.js`   — needs pState + npcObjects + SPELLS + VFX functions
7. `hands.js`  — needs SPELLS + castSpell()
8. `loop.js`   — needs everything above (runs last)

---

## 🏠 ADDING GLB MODELS

### NPC models (nenek, badang)
Already wired up in `js/npcs.js` at the bottom:
```js
loadNPCModelFromURL('nenek',  './models/nenek.glb');
loadNPCModelFromURL('badang', './models/badang.glb');
```

### House model
In `js/world.js`, comment out the `buildHouse()` calls and uncomment `loadHouseGLB()`:
```js
// Comment these out:
// buildHouse(-12, -12, 0xc87850, 0xe84040);
// buildHouse( 12, -12, 0xb06840, 0xc03030);
// buildHouse(-12,  12, 0xd09060, 0xe05020);
// buildHouse( 12,  12, 0xb87848, 0xd03838);

// Uncomment these:
loadHouseGLB('./models/house.glb', -12, -12);
loadHouseGLB('./models/house.glb',  12, -12);
loadHouseGLB('./models/house.glb', -12,  12);
loadHouseGLB('./models/house.glb',  12,  12);
```

---

## 🐛 DEBUGGING — Which File to Check

| Problem | File to open |
|---|---|
| NPC not showing | `js/npcs.js` |
| House not loading | `js/world.js` |
| Spell not casting | `js/game.js` |
| Gesture not detected | `js/hands.js` |
| Camera/movement broken | `js/player.js` |
| VFX not showing | `js/vfx.js` |
| Wrong NPC data/dialog | `js/data.js` |
| Styling broken | `css/style.css` |
