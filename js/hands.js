// ═══════════════════════════════════════════════════
// js/hands.js  —  MediaPipe hand tracking & gestures
// ═══════════════════════════════════════════════════
'use strict';

const handCanvas = document.getElementById('hand-canvas');
const handCtx    = handCanvas.getContext('2d');
handCanvas.width  = 240; handCanvas.height = 180;
handCanvas.style.width  = '240px';
handCanvas.style.height = '180px';

// ── Classify gesture from landmarks ──
// Returns 'open' (palm), 'fist', or null
function classifyHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const fingerTips = [8, 12, 16, 20];
  const fingerPip  = [6, 10, 14, 18];
  let extendedCount = 0;
  fingerTips.forEach((tipIdx, i) => {
    if (landmarks[tipIdx].y < landmarks[fingerPip[i]].y - 0.03) extendedCount++;
  });
  if (extendedCount >= 3) return 'open';
  if (extendedCount <= 1) return 'fist';
  return null;
}

// ── Map hand side + gesture → spell key ──
// Left  open  = water  |  Left  fist = earth
// Right open  = light  |  Right fist = heat
function handGestureToSpell(handedness, gesture) {
  if (!gesture) return null;
  if (handedness === 'Left')
    return gesture === 'open' ? 'water' : gesture === 'fist' ? 'earth' : null;
  else
    return gesture === 'open' ? 'light' : gesture === 'fist' ? 'heat'  : null;
}

// ── Per-hand state ──
const handState = {
  left:  { gesture: null, spell: null, holdFrames: 0, lastSpell: null },
  right: { gesture: null, spell: null, holdFrames: 0, lastSpell: null },
};
const HOLD_NEEDED = 22; // ~0.7 s at 30 fps to trigger a spell

// ── Skeleton connections for drawing ──
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function drawHandSkeleton(results) {
  handCtx.clearRect(0, 0, 240, 180);
  handState.left.gesture  = null; handState.left.spell  = null;
  handState.right.gesture = null; handState.right.spell = null;
  if (!results.multiHandLandmarks) return;

  results.multiHandLandmarks.forEach((lm, idx) => {
    const handedness = results.multiHandedness[idx].label;
    const gesture    = classifyHandGesture(lm);
    const spell      = handGestureToSpell(handedness, gesture);
    const side       = handedness === 'Left' ? 'left' : 'right';

    handState[side].gesture = gesture;
    handState[side].spell   = spell;

    const connColor = handedness === 'Left' ? '#6E3BB8' : '#06B6D4';
    const dotColor  = spell ? SPELLS[spell].css : '#ffffff44';

    // Mirror x so it looks like a mirror to the user
    const mx = x => (1 - x) * 240;
    const my = y => y * 180;

    // Draw bones
    handCtx.strokeStyle = connColor + '99';
    handCtx.lineWidth   = 2;
    CONNECTIONS.forEach(([a, b]) => {
      handCtx.beginPath();
      handCtx.moveTo(mx(lm[a].x), my(lm[a].y));
      handCtx.lineTo(mx(lm[b].x), my(lm[b].y));
      handCtx.stroke();
    });

    // Draw joints
    lm.forEach((p, i) => {
      const isKey = [4, 8, 12, 16, 20, 0].includes(i);
      handCtx.beginPath();
      handCtx.arc(mx(p.x), my(p.y), isKey ? 5 : 2.5, 0, Math.PI * 2);
      handCtx.fillStyle = isKey ? dotColor : connColor + '88';
      handCtx.fill();
    });

    // Label near wrist
    handCtx.font      = 'bold 10px monospace';
    handCtx.fillStyle = connColor;
    handCtx.fillText(
      spell ? SPELLS[spell].icon + ' ' + SPELLS[spell].name : (gesture || '?'),
      mx(lm[0].x) - 20,
      my(lm[0].y) + 14
    );
  });
}

// ── Process one frame from MediaPipe ──
function processHandFrame(results) {
  drawHandSkeleton(results);

  // ☀️🌙 Sky mode gesture (finger count) — only when free roaming
  if (dialogPhase === 0) processSkyGesture(results);

  ['left', 'right'].forEach(side => {
    const hs       = handState[side];
    const spell    = hs.spell;
    const isL      = side === 'left';
    const dot      = document.getElementById(isL ? 'lh-dot'    : 'rh-dot');
    const nameEl   = document.getElementById(isL ? 'lh-name'   : 'rh-name');
    const chargeEl = document.getElementById(isL ? 'lh-charge' : 'rh-charge');

    if (spell) {
      dot.classList.add('active');
      nameEl.textContent = SPELLS[spell].icon + ' ' + SPELLS[spell].name;

      if (spell === hs.lastSpell) {
        hs.holdFrames++;
        const pct = Math.min(100, (hs.holdFrames / HOLD_NEEDED) * 100);
        chargeEl.style.width      = pct + '%';
        chargeEl.style.background =
          `linear-gradient(90deg,${SPELLS[spell].css}88,${SPELLS[spell].css})`;

        if (hs.holdFrames === HOLD_NEEDED) {
          castSpell(spell);
          hs.holdFrames       = 0;
          chargeEl.style.width = '0%';
        }
      } else {
        hs.holdFrames       = 0;
        chargeEl.style.width = '0%';
      }
      hs.lastSpell = spell;

    } else {
      dot.classList.remove('active');
      nameEl.textContent   = hs.gesture ? `(${hs.gesture})` : '—';
      chargeEl.style.width = '0%';
      hs.holdFrames        = 0;
      hs.lastSpell         = null;
    }
  });
}

// ── Init MediaPipe ──
(function startHandTracking() {
  const videoEl = document.getElementById('webcam');
  const hands   = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });
  hands.setOptions({
    maxNumHands:          2,
    modelComplexity:      0,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.6,
  });
  hands.onResults(processHandFrame);

  const cam = new Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 320, height: 240,
  });
  cam.start().catch(() => {
    notify('NO CAMERA — USE Q W Z R KEYS');
  });
})();

document.getElementById('hand-status').style.display = 'flex';