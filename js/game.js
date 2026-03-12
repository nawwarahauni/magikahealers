// ═══════════════════════════════════════════════════
// js/game.js  —  Game state, dialog, casting, healing
// ═══════════════════════════════════════════════════
'use strict';

let gameRunning = false;
let dialogPhase = 0;  // 0=free  1=dialog  2=casting
let activeNPC   = null;
let comboIndex  = 0;
let comboWrong  = 0;
let healedCount = 0;

// ── Find the closest un-healed NPC within reach ──
function getNearbyNPC() {
  let closest = null, closestD = 2.5;
  NPCS_DATA.forEach(data => {
    const obj = npcObjects[data.id];
    if (obj.group._state === 'healed') return;
    const d = pState.pos.distanceTo(obj.group.position);
    if (d < closestD) { closestD = d; closest = data; }
  });
  return closest;
}

// ── E / Space pressed ──
function handleInteract() {
  if (dialogPhase === 1) { openCasting(); return; }
  if (dialogPhase === 2) return;

  const npc = getNearbyNPC();
  if (npc) {
    activeNPC = npc;
    document.exitPointerLock();
    showDialog(npc.name, npc.intro);
    dialogPhase = 1;
    document.getElementById('hud-quest').style.display = 'block';
    document.getElementById('hud-qtext').textContent   = 'HEAL: ' + npc.ailment;
  }
}

// ── Show NPC dialog box ──
function showDialog(name, text) {
  document.getElementById('dlg-name').textContent   = '◆ ' + name + ' ◆';
  document.getElementById('dlg-text').textContent   = text;
  document.getElementById('dlg-prompt').textContent = '▼ PRESS E / SPACE TO CONTINUE';
  document.getElementById('dialog-box').classList.add('show');
  document.getElementById('casting-box').classList.remove('show');
}

// ── Open the spell casting panel ──
function openCasting() {
  document.getElementById('dialog-box').classList.remove('show');
  dialogPhase = 2; comboIndex = 0; comboWrong = 0;
  const npc = activeNPC;

  // Build combo step pills
  const stepsEl = document.getElementById('combo-steps');
  stepsEl.innerHTML = '';
  npc.comboLabels.forEach((lbl, i) => {
    const d       = document.createElement('div');
    d.className   = 'cs' + (i === 0 ? ' active' : '');
    d.id          = 'cs-' + i;
    d.textContent = lbl;
    stepsEl.appendChild(d);
  });

  // Build keyboard fallback buttons
  const kbEl = document.getElementById('kb-spells');
  kbEl.innerHTML = '';
  const keyMap = { water:'Q', earth:'W', light:'Z', heat:'R' };
  npc.spells.forEach(key => {
    const btn     = document.createElement('button');
    btn.className = 'kb';
    btn.innerHTML = SPELLS[key].icon + ' ' + SPELLS[key].name
      + '<br><span style="color:#443;font-size:4px">' + keyMap[key] + '</span>';
    btn.onclick = () => {
      const ok = key === activeNPC.combo[comboIndex];
      castSpell(key);
      btn.classList.add(ok ? 'ok' : 'fail');
      setTimeout(() => btn.classList.remove('ok', 'fail'), 400);
    };
    kbEl.appendChild(btn);
  });

  document.getElementById('cast-title').textContent =
    '✦ HEAL: ' + npc.name + ' — ' + npc.ailment + ' ✦';
  document.getElementById('casting-box').classList.add('show');
}

// ── Player casts a spell ──
function castSpell(key) {
  if (dialogPhase !== 2 || !activeNPC) return;

  const expected = activeNPC.combo[comboIndex];
  const spell    = SPELLS[key];
  const npcObj   = npcObjects[activeNPC.id];
  const stepEl   = document.getElementById('cs-' + comboIndex);

  if (key === expected) {
    //  Correct
    if (stepEl) { stepEl.classList.remove('active'); stepEl.classList.add('done'); }
    fireSpellVFX(spell.color, npcObj.group, false);
    notify(spell.icon + ' ' + spell.name + ' — CORRECT!');
    showFeedback('✅', 'Correct!', spell.icon + ' ' + spell.name + ' applied');
    spawnFloatText('+HP ✓', spell.css);
    comboIndex++;
    const next = document.getElementById('cs-' + comboIndex);
    if (next) next.classList.add('active');
    if (comboIndex >= activeNPC.combo.length) setTimeout(() => resolveHeal(true), 700);

  } else {
    // Wrong
    if (stepEl) {
      stepEl.classList.add('wrong');
      setTimeout(() => stepEl.classList.remove('wrong'), 400);
    }
    comboWrong++;
    notify('✗ WRONG! Expected ' + SPELLS[expected].icon + ' ' + SPELLS[expected].name);
    showFeedback('❌', 'Wrong Spell!', 'Expected: ' + SPELLS[expected].icon + ' ' + SPELLS[expected].name);
    spawnFloatText('✗ Wrong', '#EF4444');

    // Camera shake
    let st = 0;
    const si = setInterval(() => {
      st += 0.3;
      camera.rotation.z = Math.sin(st * 20) * 0.02 * Math.exp(-st);
      if (st > 1) { camera.rotation.z = 0; clearInterval(si); }
    }, 16);

    if (comboWrong >= 3) resolveHeal(false);
  }
}

// ── Finish the healing attempt ──
function resolveHeal(success) {
  dialogPhase = 0;
  document.getElementById('casting-box').classList.remove('show');
  document.getElementById('hud-quest').style.display = 'none';
  const npcObj = npcObjects[activeNPC.id];

  if (success) {
    npcObj.group._state = 'healed';
    npcObj.group._sickSprite.visible  = false;
    npcObj.group._healSprite.visible  = true;
    npcObj.group._auraLight.color.setHex(0x22ff88);
    npcObj.group._auraLight.intensity = 2;
    healedCount++;
    document.getElementById('hud-score').textContent = healedCount + ' / 9';
    fireSpellVFX(0x22ff88, npcObj.group, true);
    showDialog('✦ HEALED! ✦', activeNPC.winMsg + '\n\n📖 ' + activeNPC.lesson);
    notify('✓ ' + activeNPC.name + ' HEALED! +1');
  } else {
    showDialog('✗ WRONG SPELLS',
      'The patient worsens! Try again.\n\n💡 HINT: ' + activeNPC.comboLabels.join(' → '));
    npcObj.group._state = 'sick';
  }

  document.getElementById('dlg-prompt').textContent = '▼ PRESS E / SPACE TO CLOSE';

  // Close dialog on next E / Space
  const close = (e) => {
    if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('dialog-box').classList.remove('show');
      dialogPhase = 0;
      document.removeEventListener('keydown', close);
      if (healedCount >= 9)
        setTimeout(() => document.getElementById('win').classList.add('show'), 400);
    }
  };
  setTimeout(() => document.addEventListener('keydown', close), 300);
}

// ── UI helpers ──
function notify(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.classList.add('show');
  clearTimeout(notify._t);
  notify._t = setTimeout(() => n.classList.remove('show'), 2400);
}

function showFeedback(icon, text, sub) {
  const fb = document.getElementById('feedback');
  document.getElementById('fb-icon').textContent = icon;
  document.getElementById('fb-text').textContent = text;
  document.getElementById('fb-sub').textContent  = sub || '';
  fb.classList.add('show');
  clearTimeout(showFeedback._t);
  showFeedback._t = setTimeout(() => fb.classList.remove('show'), 1800);
}

function spawnFloatText(text, color) {
  const el       = document.createElement('div');
  el.className   = 'float-txt';
  el.textContent = text;
  el.style.color = color;
  el.style.left  = (35 + Math.random() * 20) + '%';
  el.style.top   = '42%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

// ── Start game ──
function startGame() {
  document.getElementById('title').style.display = 'none';
  gameRunning = true;
  canvas3dEl.requestPointerLock();
}