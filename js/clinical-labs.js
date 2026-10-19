/**
 * ===================================================================
 * CLINICAL & APPLIED AI RESEARCH SANDBOX
 * Author: Athul S Kumar | Data Scientist
 * St. John's Research Institute (SJRI)
 * ===================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initLabTabs();
  initCXRLab();
  initGaitLab();
  initSLAMLab();
  initKGLab();
  initHRCTLab();
});

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/* -------------------------------------------------------------------
   1. LAB TABS MANAGEMENT
   ------------------------------------------------------------------- */
function initLabTabs() {
  const tabBtns = document.querySelectorAll('.lab-tab-btn');
  const panes = document.querySelectorAll('.lab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      window.dispatchEvent(new Event('resize'));
    });
  });
}

/* -------------------------------------------------------------------
   2. LAB 1: CHEST RADIOGRAPHY (CXR) AI & GRAD-CAM SIMULATOR
   ------------------------------------------------------------------- */
function initCXRLab() {
  const canvas = document.getElementById('cxrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rocCanvas = document.getElementById('rocCanvas');
  const rocCtx = rocCanvas ? rocCanvas.getContext('2d') : null;

  let currentCondition = 'tb';
  let showHeatmap = true;
  let showGroundTruth = true;
  let operatingThreshold = 0.45;

  const conditionData = {
    tb: {
      name: 'Pulmonary Tuberculosis (Active Cavitary)',
      shortName: 'Pulmonary TB',
      cohort: 'Tertiary Hospital Cohort (India)',
      baseProbability: 0.912,
      findings: 'Right upper lobe cavitary lesion with surrounding fibronodular infiltration.',
      gtBox: { x: 0.58, y: 0.22, w: 0.22, h: 0.24 },
      heatmapCenter: { x: 0.69, y: 0.33, radius: 0.18, intensity: 0.95 }
    },
    infiltrate: {
      name: 'Thoracic Consolidation & Infiltrates',
      shortName: 'Infiltrates & Consolidation',
      cohort: 'Multi-Site Clinical Cohort',
      baseProbability: 0.835,
      findings: 'Bilateral basal patchy consolidation and interstitial prominence.',
      gtBox: { x: 0.24, y: 0.50, w: 0.52, h: 0.28 },
      heatmapCenter: { x: 0.48, y: 0.62, radius: 0.25, intensity: 0.82 }
    },
    normal: {
      name: 'Normal Chest Radiograph',
      shortName: 'Normal Screening',
      cohort: 'Screening Baseline Cohort',
      baseProbability: 0.045,
      findings: 'Clear bilateral lung fields, normal cardiothoracic ratio (<0.50), no active parenchymal lesions.',
      gtBox: null,
      heatmapCenter: null
    }
  };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1) || 500;
    canvas.height = rect.width * (window.devicePixelRatio || 1) || 500;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    if (rocCanvas) {
      const rocRect = rocCanvas.getBoundingClientRect();
      rocCanvas.width = rocRect.width * (window.devicePixelRatio || 1) || 280;
      rocCanvas.height = rocRect.height * (window.devicePixelRatio || 1) || 120;
      rocCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    renderCXR();
    renderROC();
  }

  function renderCXR() {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    if (W === 0 || H === 0) return;

    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(160, 180, 205, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.52, W * 0.42, H * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Lung Fields
    const lungGradL = ctx.createRadialGradient(W * 0.35, H * 0.45, 10, W * 0.35, H * 0.45, W * 0.28);
    lungGradL.addColorStop(0, '#0a0e16');
    lungGradL.addColorStop(0.7, '#141d2e');
    lungGradL.addColorStop(1, '#080c14');
    ctx.fillStyle = lungGradL;
    ctx.beginPath();
    ctx.ellipse(W * 0.35, H * 0.48, W * 0.17, H * 0.34, -0.05, 0, Math.PI * 2);
    ctx.fill();

    const lungGradR = ctx.createRadialGradient(W * 0.65, H * 0.46, 10, W * 0.65, H * 0.46, W * 0.28);
    lungGradR.addColorStop(0, '#0a0e16');
    lungGradR.addColorStop(0.7, '#141d2e');
    lungGradR.addColorStop(1, '#080c14');
    ctx.fillStyle = lungGradR;
    ctx.beginPath();
    ctx.ellipse(W * 0.65, H * 0.49, W * 0.17, H * 0.33, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Mediastinum & Spine
    const spineGrad = ctx.createLinearGradient(W * 0.45, 0, W * 0.55, 0);
    spineGrad.addColorStop(0, 'rgba(170, 185, 210, 0.1)');
    spineGrad.addColorStop(0.5, 'rgba(210, 225, 245, 0.55)');
    spineGrad.addColorStop(1, 'rgba(170, 185, 210, 0.1)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(W * 0.46, H * 0.08, W * 0.08, H * 0.84);

    // Heart Silhouette
    ctx.fillStyle = 'rgba(200, 215, 235, 0.42)';
    ctx.beginPath();
    ctx.ellipse(W * 0.48, H * 0.60, W * 0.14, H * 0.16, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Diaphragm arches
    ctx.strokeStyle = 'rgba(210, 225, 245, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(W * 0.33, H * 0.88, W * 0.22, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W * 0.67, H * 0.90, W * 0.21, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Clavicles
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(220, 230, 245, 0.6)';
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H * 0.22);
    ctx.quadraticCurveTo(W * 0.32, H * 0.24, W * 0.46, H * 0.20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W * 0.82, H * 0.22);
    ctx.quadraticCurveTo(W * 0.68, H * 0.24, W * 0.54, H * 0.20);
    ctx.stroke();

    // Rib shadows
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(180, 195, 215, 0.18)';
    for (let r = 1; r <= 7; r++) {
      const yOffset = H * 0.18 + r * H * 0.08;
      ctx.beginPath();
      ctx.moveTo(W * 0.48, yOffset - 10);
      ctx.quadraticCurveTo(W * 0.32, yOffset + 15, W * 0.18, yOffset - 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(W * 0.52, yOffset - 10);
      ctx.quadraticCurveTo(W * 0.68, yOffset + 15, W * 0.82, yOffset - 5);
      ctx.stroke();
    }

    const cond = conditionData[currentCondition];

    if (currentCondition === 'tb') {
      ctx.strokeStyle = 'rgba(235, 240, 255, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(W * 0.69, H * 0.33, W * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#070a10';
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 220, 250, 0.32)';
      ctx.beginPath();
      ctx.ellipse(W * 0.70, H * 0.34, W * 0.08, W * 0.07, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (currentCondition === 'infiltrate') {
      ctx.fillStyle = 'rgba(210, 225, 245, 0.28)';
      ctx.beginPath();
      ctx.ellipse(W * 0.35, H * 0.62, W * 0.11, W * 0.08, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.64, H * 0.64, W * 0.12, W * 0.09, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (showHeatmap && cond.heatmapCenter) {
      const hc = cond.heatmapCenter;
      const hx = W * hc.x;
      const hy = H * hc.y;
      const hr = W * hc.radius;

      const grad = ctx.createRadialGradient(hx, hy, 2, hx, hy, hr);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.75)');
      grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.65)');
      grad.addColorStop(0.65, 'rgba(16, 185, 129, 0.45)');
      grad.addColorStop(0.9, 'rgba(6, 182, 212, 0.25)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (showGroundTruth && cond.gtBox) {
      const b = cond.gtBox;
      const bx = W * b.x;
      const by = H * b.y;
      const bw = W * b.w;
      const bh = H * b.h;

      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      ctx.fillStyle = '#059669';
      ctx.fillRect(bx, by - 20, 115, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 9px var(--font-mono)';
      ctx.fillText('RAD CONSENSUS', bx + 6, by - 7);
    }

    ctx.restore();
    updateCXRMetrics(cond);
  }

  function renderROC() {
    if (!rocCtx) return;
    const rw = rocCanvas.getBoundingClientRect().width;
    const rh = rocCanvas.getBoundingClientRect().height;
    if (rw === 0 || rh === 0) return;

    const dark = isDarkTheme();
    rocCtx.clearRect(0, 0, rw, rh);
    rocCtx.fillStyle = dark ? '#0f172a' : '#ffffff';
    rocCtx.fillRect(0, 0, rw, rh);

    const pad = 20;
    const gw = rw - pad * 2;
    const gh = rh - pad * 2;

    rocCtx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
    rocCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = pad + (gw * i) / 4;
      const gy = pad + (gh * i) / 4;
      rocCtx.beginPath();
      rocCtx.moveTo(gx, pad); rocCtx.lineTo(gx, rh - pad);
      rocCtx.moveTo(pad, gy); rocCtx.lineTo(rw - pad, gy);
      rocCtx.stroke();
    }

    rocCtx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1';
    rocCtx.setLineDash([3, 3]);
    rocCtx.beginPath();
    rocCtx.moveTo(pad, rh - pad);
    rocCtx.lineTo(rw - pad, pad);
    rocCtx.stroke();
    rocCtx.setLineDash([]);

    // ROC Sensitivity vs Specificity Trade-Off Curve
    rocCtx.strokeStyle = '#2563eb';
    rocCtx.lineWidth = 2.2;
    rocCtx.beginPath();
    rocCtx.moveTo(pad, rh - pad);
    for (let x = 0; x <= 1; x += 0.02) {
      const y = Math.pow(x, 0.15);
      const px = pad + x * gw;
      const py = rh - pad - y * gh;
      rocCtx.lineTo(px, py);
    }
    rocCtx.stroke();

    const curFPR = Math.max(0.02, Math.min(0.85, Math.pow(1 - operatingThreshold, 2.2)));
    const curTPR = Math.pow(curFPR, 0.15);
    const opX = pad + curFPR * gw;
    const opY = rh - pad - curTPR * gh;

    rocCtx.fillStyle = '#d97706';
    rocCtx.beginPath();
    rocCtx.arc(opX, opY, 5, 0, Math.PI * 2);
    rocCtx.fill();
    rocCtx.strokeStyle = '#ffffff';
    rocCtx.lineWidth = 1.5;
    rocCtx.stroke();

    rocCtx.fillStyle = dark ? '#94a3b8' : '#64748b';
    rocCtx.font = '500 8.5px var(--font-mono)';
    rocCtx.fillText('1 - Specificity', rw / 2 - 25, rh - 4);
    rocCtx.save();
    rocCtx.translate(8, rh / 2 + 12);
    rocCtx.rotate(-Math.PI / 2);
    rocCtx.fillText('Sensitivity', 0, 0);
    rocCtx.restore();
  }

  function updateCXRMetrics(cond) {
    const rawProb = cond.baseProbability;
    const isDetected = rawProb >= operatingThreshold;

    const condEl = document.getElementById('cxrConditionName');
    const modeEl = document.getElementById('cxrOperatingMode');
    const concEl = document.getElementById('cxrPanelConcordance');
    const statusEl = document.getElementById('cxrClinicalStatus');
    const findingsEl = document.getElementById('cxrFindingsText');

    if (condEl) condEl.textContent = cond.shortName;
    if (modeEl) {
      if (operatingThreshold <= 0.35) {
        modeEl.textContent = 'High Sensitivity (Triage)';
        modeEl.style.color = 'var(--accent-blue)';
      } else if (operatingThreshold >= 0.65) {
        modeEl.textContent = 'High Specificity (Rule-In)';
        modeEl.style.color = '#7c3aed';
      } else {
        modeEl.textContent = 'Balanced Screening';
        modeEl.style.color = 'var(--accent-blue)';
      }
    }
    if (concEl) {
      if (currentCondition === 'normal') {
        concEl.textContent = isDetected ? 'Discordant Flag' : 'Concordant Normal';
        concEl.style.color = isDetected ? '#e11d48' : 'var(--accent-emerald)';
      } else {
        concEl.textContent = isDetected ? 'Panel Concordant' : 'Sub-Threshold Review';
        concEl.style.color = isDetected ? 'var(--accent-emerald)' : '#d97706';
      }
    }
    if (statusEl) {
      if (currentCondition === 'normal') {
        statusEl.textContent = isDetected ? 'FLAGGED FOR SECOND RADIOLOGIST REVIEW' : 'CONCORDANT: NORMAL SCREENING BASELINE';
        statusEl.style.color = isDetected ? '#e11d48' : 'var(--accent-emerald)';
      } else if (isDetected) {
        statusEl.textContent = 'TRIAGE FLAG: RADIOLOGIC LESION IDENTIFIED';
        statusEl.style.color = 'var(--accent-amber)';
      } else {
        statusEl.textContent = 'BELOW OPERATING CUTOFF (RULE-OUT)';
        statusEl.style.color = 'var(--accent-blue)';
      }
    }
    if (findingsEl) findingsEl.textContent = cond.findings;
  }

  const toggleHeatmapBtn = document.getElementById('toggleCXRHeatmap');
  if (toggleHeatmapBtn) {
    toggleHeatmapBtn.addEventListener('click', () => {
      showHeatmap = !showHeatmap;
      toggleHeatmapBtn.classList.toggle('active', showHeatmap);
      renderCXR();
    });
  }

  const toggleGTBtn = document.getElementById('toggleCXRGT');
  if (toggleGTBtn) {
    toggleGTBtn.addEventListener('click', () => {
      showGroundTruth = !showGroundTruth;
      toggleGTBtn.classList.toggle('active', showGroundTruth);
      renderCXR();
    });
  }

  const thresholdSlider = document.getElementById('cxrThresholdSlider');
  const thresholdValDisplay = document.getElementById('cxrThresholdVal');
  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', (e) => {
      operatingThreshold = parseFloat(e.target.value);
      if (thresholdValDisplay) thresholdValDisplay.textContent = operatingThreshold.toFixed(2);
      renderCXR();
      renderROC();
    });
  }

  const conditionBtns = document.querySelectorAll('.cxr-cond-btn');
  conditionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      conditionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCondition = btn.getAttribute('data-cond');
      renderCXR();
      renderROC();
    });
  });

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 150);
}

/* -------------------------------------------------------------------
   3. LAB 2: MARKERLESS GAIT KINEMATICS & 2D POSE SIMULATOR
   ------------------------------------------------------------------- */
function initGaitLab() {
  const canvas = document.getElementById('gaitCanvas');
  const angleCanvas = document.getElementById('gaitAngleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const angleCtx = angleCanvas ? angleCanvas.getContext('2d') : null;

  let isPlaying = true;
  let gaitPhase = 0;
  let speedMultiplier = 1.0;
  let gaitType = 'normal';

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    if (angleCanvas) {
      const aRect = angleCanvas.getBoundingClientRect();
      angleCanvas.width = aRect.width * (window.devicePixelRatio || 1);
      angleCanvas.height = aRect.height * (window.devicePixelRatio || 1);
      angleCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }

  function computePose(phase, type) {
    const t = phase * Math.PI * 2;

    let hipL = Math.sin(t) * 0.45;
    let hipR = Math.sin(t + Math.PI) * 0.45;

    let kneeL = Math.max(0, Math.sin(t - 0.4) * 0.85);
    let kneeR = Math.max(0, Math.sin(t + Math.PI - 0.4) * 0.85);

    let ankleL = Math.sin(t + 0.2) * 0.25;
    let ankleR = Math.sin(t + Math.PI + 0.2) * 0.25;

    let armL = Math.sin(t + Math.PI) * 0.35;
    let armR = Math.sin(t) * 0.35;

    if (type === 'asymmetric') {
      hipR *= 0.6;
      kneeR *= 0.55;
    } else if (type === 'shuffling') {
      hipL *= 0.4;
      hipR *= 0.4;
      kneeL *= 0.35;
      kneeR *= 0.35;
      armL *= 0.1;
      armR *= 0.1;
    }

    return { hipL, hipR, kneeL, kneeR, ankleL, ankleR, armL, armR };
  }

  function drawGaitFrame() {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    if (W === 0 || H === 0) return;

    ctx.clearRect(0, 0, W, H);

    const floorY = H * 0.85;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    for (let x = 0; x < W; x += 40) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x, floorY + 10);
      ctx.stroke();
    }

    const pose = computePose(gaitPhase, gaitType);
    const rootX = W * 0.5;
    const comBounce = Math.cos(gaitPhase * Math.PI * 4) * 6;
    const rootY = H * 0.45 + comBounce;

    const thighLen = H * 0.19;
    const shankLen = H * 0.19;
    const torsoLen = H * 0.22;
    const armUpper = H * 0.13;
    const armLower = H * 0.12;

    const shoulderX = rootX;
    const shoulderY = rootY - torsoLen;
    const headX = shoulderX;
    const headY = shoulderY - H * 0.08;

    const kxL = rootX + Math.sin(pose.hipL) * thighLen;
    const kyL = rootY + Math.cos(pose.hipL) * thighLen;
    const axL = kxL + Math.sin(pose.hipL - pose.kneeL) * shankLen;
    const ayL = kyL + Math.cos(pose.hipL - pose.kneeL) * shankLen;
    const toeXL = axL + 16;
    const toeYL = Math.min(floorY, ayL + 6);

    const kxR = rootX + Math.sin(pose.hipR) * thighLen;
    const kyR = rootY + Math.cos(pose.hipR) * thighLen;
    const axR = kxR + Math.sin(pose.hipR - pose.kneeR) * shankLen;
    const ayR = kyR + Math.cos(pose.hipR - pose.kneeR) * shankLen;
    const toeXR = axR + 16;
    const toeYR = Math.min(floorY, ayR + 6);

    const elxL = shoulderX + Math.sin(pose.armL) * armUpper;
    const elyL = shoulderY + Math.cos(pose.armL) * armUpper;
    const wrxL = elxL + Math.sin(pose.armL + 0.3) * armLower;
    const wryL = elyL + Math.cos(pose.armL + 0.3) * armLower;

    const elxR = shoulderX + Math.sin(pose.armR) * armUpper;
    const elyR = shoulderY + Math.cos(pose.armR) * armUpper;
    const wrxR = elxR + Math.sin(pose.armR + 0.3) * armLower;
    const wryR = elyR + Math.cos(pose.armR + 0.3) * armLower;

    // Back limbs
    drawLimb(ctx, shoulderX, shoulderY, elxL, elyL, 'rgba(56, 189, 248, 0.4)', 3);
    drawLimb(ctx, elxL, elyL, wrxL, wryL, 'rgba(56, 189, 248, 0.4)', 3);
    drawLimb(ctx, rootX, rootY, kxL, kyL, 'rgba(56, 189, 248, 0.4)', 4);
    drawLimb(ctx, kxL, kyL, axL, ayL, 'rgba(56, 189, 248, 0.4)', 4);
    drawLimb(ctx, axL, ayL, toeXL, toeYL, 'rgba(56, 189, 248, 0.4)', 3);

    // Torso & Head
    drawLimb(ctx, rootX, rootY, shoulderX, shoulderY, '#38bdf8', 5);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(headX, headY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Foreground limbs
    drawLimb(ctx, shoulderX, shoulderY, elxR, elyR, '#06b6d4', 4);
    drawLimb(ctx, elxR, elyR, wrxR, wryR, '#06b6d4', 4);
    drawLimb(ctx, rootX, rootY, kxR, kyR, '#10b981', 5);
    drawLimb(ctx, kxR, kyR, axR, ayR, '#10b981', 5);
    drawLimb(ctx, axR, ayR, toeXR, toeYR, '#10b981', 3.5);

    // Keypoints
    const keypoints = [
      { x: rootX, y: rootY },
      { x: shoulderX, y: shoulderY },
      { x: kxR, y: kyR },
      { x: axR, y: ayR },
      { x: kxL, y: kyL },
      { x: axL, y: ayL }
    ];

    keypoints.forEach(kp => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const phasePercent = Math.round(gaitPhase * 100);
    let phaseName = 'Initial Contact (Heel Strike)';
    if (phasePercent > 12 && phasePercent <= 30) phaseName = 'Loading Response / Mid-Stance';
    else if (phasePercent > 30 && phasePercent <= 50) phaseName = 'Terminal Stance';
    else if (phasePercent > 50 && phasePercent <= 62) phaseName = 'Pre-Swing (Toe-Off)';
    else if (phasePercent > 62 && phasePercent <= 75) phaseName = 'Initial Swing';
    else if (phasePercent > 75 && phasePercent <= 87) phaseName = 'Mid-Swing';
    else if (phasePercent > 87) phaseName = 'Terminal Swing';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10.5px var(--font-mono)';
    ctx.fillText(`GAIT CYCLE: ${phasePercent}%`, 14, 24);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PHASE: ${phaseName}`, 14, 40);

    drawAngleTrajectory(pose, gaitPhase);
    updateGaitStats(phasePercent, phaseName);

    if (isPlaying) {
      gaitPhase = (gaitPhase + 0.008 * speedMultiplier) % 1.0;
      const scrubber = document.getElementById('gaitScrubber');
      if (scrubber) scrubber.value = Math.round(gaitPhase * 100);
    }

    requestAnimationFrame(drawGaitFrame);
  }

  function drawLimb(c, x1, y1, x2, y2, color, width) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  function drawAngleTrajectory(pose, currentPhase) {
    if (!angleCtx) return;
    const aw = angleCanvas.getBoundingClientRect().width;
    const ah = angleCanvas.getBoundingClientRect().height;
    if (aw === 0 || ah === 0) return;

    const dark = isDarkTheme();
    angleCtx.clearRect(0, 0, aw, ah);
    angleCtx.fillStyle = dark ? '#0f172a' : '#ffffff';
    angleCtx.fillRect(0, 0, aw, ah);

    const pad = 20;
    const gw = aw - pad * 2;
    const gh = ah - pad * 2;

    angleCtx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
    angleCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = pad + (gw * i) / 4;
      angleCtx.beginPath();
      angleCtx.moveTo(gx, pad); angleCtx.lineTo(gx, ah - pad);
      angleCtx.stroke();
    }

    angleCtx.strokeStyle = '#059669';
    angleCtx.lineWidth = 2;
    angleCtx.beginPath();
    for (let p = 0; p <= 1; p += 0.02) {
      const ang = Math.sin(p * Math.PI * 2 - 0.4);
      const kneeDeg = Math.max(0, ang * 62);
      const x = pad + p * gw;
      const y = ah - pad - (kneeDeg / 70) * gh;
      if (p === 0) angleCtx.moveTo(x, y);
      else angleCtx.lineTo(x, y);
    }
    angleCtx.stroke();

    const curX = pad + currentPhase * gw;
    angleCtx.strokeStyle = '#d97706';
    angleCtx.lineWidth = 1.5;
    angleCtx.setLineDash([2, 2]);
    angleCtx.beginPath();
    angleCtx.moveTo(curX, pad);
    angleCtx.lineTo(curX, ah - pad);
    angleCtx.stroke();
    angleCtx.setLineDash([]);

    const curAng = Math.max(0, Math.sin(currentPhase * Math.PI * 2 - 0.4) * 62).toFixed(1);
    angleCtx.fillStyle = '#059669';
    angleCtx.font = '600 9.5px var(--font-mono)';
    angleCtx.fillText(`KNEE FLEXION: ${curAng}°`, pad + 6, pad + 14);
  }

  function updateGaitStats(phase, name) {
    const cadenceEl = document.getElementById('gaitCadence');
    const speedEl = document.getElementById('gaitSpeed');
    const stanceRatioEl = document.getElementById('gaitStanceRatio');

    if (gaitType === 'normal') {
      if (cadenceEl) cadenceEl.textContent = '112 steps/min';
      if (speedEl) speedEl.textContent = '1.34 m/s';
      if (stanceRatioEl) stanceRatioEl.textContent = '61.4% / 38.6%';
    } else if (gaitType === 'asymmetric') {
      if (cadenceEl) cadenceEl.textContent = '94 steps/min';
      if (speedEl) speedEl.textContent = '0.98 m/s';
      if (stanceRatioEl) stanceRatioEl.textContent = '72.1% / 27.9%';
    } else if (gaitType === 'shuffling') {
      if (cadenceEl) cadenceEl.textContent = '82 steps/min';
      if (speedEl) speedEl.textContent = '0.64 m/s';
      if (stanceRatioEl) stanceRatioEl.textContent = '78.5% / 21.5%';
    }
  }

  const playBtn = document.getElementById('gaitPlayBtn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? '⏸ Pause Kinematics' : '▶ Play Kinematics';
    });
  }

  const scrubber = document.getElementById('gaitScrubber');
  if (scrubber) {
    scrubber.addEventListener('input', (e) => {
      isPlaying = false;
      if (playBtn) playBtn.textContent = '▶ Play Kinematics';
      gaitPhase = parseInt(e.target.value) / 100;
    });
  }

  const typeBtns = document.querySelectorAll('.gait-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gaitType = btn.getAttribute('data-type');
    });
  });

  window.addEventListener('resize', resize);
  setTimeout(resize, 150);
  requestAnimationFrame(drawGaitFrame);
}

/* -------------------------------------------------------------------
   4. LAB 3: INTERACTIVE BIOMEDICAL KNOWLEDGE GRAPH (NCBI/GRAPHXR)
   ------------------------------------------------------------------- */
function initKGLab() {
  const canvas = document.getElementById('kgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const nodes = [
    { id: 'MUC5B', label: 'MUC5B', group: 'gene', x: 200, y: 150, vx: 0, vy: 0, r: 22, info: 'Major mucin gene. Promoter polymorphism rs35705950 strongly associated with Idiopathic Pulmonary Fibrosis (IPF).' },
    { id: 'SFTPC', label: 'SFTPC', group: 'gene', x: 120, y: 220, vx: 0, vy: 0, r: 20, info: 'Surfactant protein C. Missense mutations cause familial interstitial lung disease and alveolar cell apoptosis.' },
    { id: 'TERT', label: 'TERT', group: 'gene', x: 180, y: 320, vx: 0, vy: 0, r: 20, info: 'Telomerase reverse transcriptase. Short telomere syndromes predispose to pulmonary fibrosis.' },
    { id: 'TNF', label: 'TNF-α', group: 'gene', x: 380, y: 360, vx: 0, vy: 0, r: 20, info: 'Pro-inflammatory cytokine driving granuloma formation in TB and fibrotic cascades.' },
    { id: 'IPF', label: 'Pulmonary Fibrosis (ILD)', group: 'disease', x: 280, y: 220, vx: 0, vy: 0, r: 30, info: 'Progressive, fibrosing interstitial lung disease detected via HRCT reticular honeycombing.' },
    { id: 'TB', label: 'Tuberculosis', group: 'disease', x: 440, y: 260, vx: 0, vy: 0, r: 28, info: 'Mycobacterium tuberculosis infection with apical cavitary lesions on chest radiographs.' },
    { id: 'NINTEDANIB', label: 'Nintedanib', group: 'drug', x: 360, y: 120, vx: 0, vy: 0, r: 18, info: 'Tyrosine kinase inhibitor targeting VEGFR, FGFR, and PDGFR to slow FVC decline in ILD.' },
    { id: 'PIRFENIDONE', label: 'Pirfenidone', group: 'drug', x: 240, y: 70, vx: 0, vy: 0, r: 18, info: 'Anti-fibrotic agent regulating TGF-beta and collagen synthesis in progressive fibrosing ILD.' },
    { id: 'RIFAMPICIN', label: 'Rifampicin', group: 'drug', x: 520, y: 340, vx: 0, vy: 0, r: 18, info: 'First-line bactericidal antibiotic for tuberculosis targeting bacterial RNA polymerase.' }
  ];

  const links = [
    { source: 'MUC5B', target: 'IPF', type: 'ASSOCIATED_WITH', weight: 0.94 },
    { source: 'SFTPC', target: 'IPF', type: 'CAUSES', weight: 0.88 },
    { source: 'TERT', target: 'IPF', type: 'RISK_FACTOR', weight: 0.85 },
    { source: 'IPF', target: 'NINTEDANIB', type: 'TREATED_BY', weight: 0.92 },
    { source: 'IPF', target: 'PIRFENIDONE', type: 'TREATED_BY', weight: 0.90 },
    { source: 'TB', target: 'RIFAMPICIN', type: 'TREATED_BY', weight: 0.96 },
    { source: 'TNF', target: 'TB', type: 'MEDIATES', weight: 0.89 },
    { source: 'TNF', target: 'IPF', type: 'ELEVATED_IN', weight: 0.72 }
  ];

  let draggedNode = null;
  let selectedNode = nodes[4];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = n.group === 'disease' ? 70 : 150;
      n.x = cx + Math.cos(angle) * radius;
      n.y = cy + Math.sin(angle) * radius;
    });
  }

  function updatePhysics() {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    if (W === 0 || H === 0) return;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 170) {
          const force = (170 - dist) / dist * 0.04;
          if (nodes[i] !== draggedNode) {
            nodes[i].x -= dx * force;
            nodes[i].y -= dy * force;
          }
          if (nodes[j] !== draggedNode) {
            nodes[j].x += dx * force;
            nodes[j].y += dy * force;
          }
        }
      }
    }

    links.forEach(link => {
      const s = nodes.find(n => n.id === link.source);
      const t = nodes.find(n => n.id === link.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = 110;
      const force = (dist - targetDist) * 0.015;

      if (s !== draggedNode) {
        s.x += (dx / dist) * force;
        s.y += (dy / dist) * force;
      }
      if (t !== draggedNode) {
        t.x -= (dx / dist) * force;
        t.y -= (dy / dist) * force;
      }
    });

    const cx = W / 2;
    const cy = H / 2;
    nodes.forEach(n => {
      if (n !== draggedNode) {
        n.x += (cx - n.x) * 0.005;
        n.y += (cy - n.y) * 0.005;
        n.x = Math.max(n.r + 10, Math.min(W - n.r - 10, n.x));
        n.y = Math.max(n.r + 10, Math.min(H - n.r - 10, n.y));
      }
    });
  }

  function drawKG() {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    if (W === 0 || H === 0) return;

    updatePhysics();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, W, H);

    links.forEach(link => {
      const s = nodes.find(n => n.id === link.source);
      const t = nodes.find(n => n.id === link.target);
      if (!s || !t) return;

      const isConnectedToSelected = selectedNode && (s.id === selectedNode.id || t.id === selectedNode.id);

      ctx.strokeStyle = isConnectedToSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isConnectedToSelected ? 2 : 1;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();

      if (isConnectedToSelected) {
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        ctx.fillStyle = '#38bdf8';
        ctx.font = '600 8.5px var(--font-mono)';
        ctx.fillText(link.type, mx - 15, my - 4);
      }
    });

    nodes.forEach(n => {
      const isSelected = selectedNode && n.id === selectedNode.id;

      let fillColor = '#0284c7';
      if (n.group === 'disease') fillColor = '#e11d48';
      else if (n.group === 'drug') fillColor = '#059669';

      if (isSelected) {
        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2.5 : 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 10px var(--font-main)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
    });

    requestAnimationFrame(drawKG);
  }

  function getNodeAt(x, y) {
    return nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 6;
    });
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = getNodeAt(x, y);
    if (hit) {
      draggedNode = hit;
      selectedNode = hit;
      updateKGPanel(hit);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!draggedNode) return;
    const rect = canvas.getBoundingClientRect();
    draggedNode.x = e.clientX - rect.left;
    draggedNode.y = e.clientY - rect.top;
  });

  window.addEventListener('mouseup', () => {
    draggedNode = null;
  });

  function updateKGPanel(node) {
    const titleEl = document.getElementById('kgNodeTitle');
    const typeEl = document.getElementById('kgNodeType');
    const descEl = document.getElementById('kgNodeDesc');
    const relsEl = document.getElementById('kgNodeRels');

    if (titleEl) titleEl.textContent = node.label;
    if (typeEl) {
      typeEl.textContent = node.group.toUpperCase();
      typeEl.className = `badge badge-${node.group === 'disease' ? 'amber' : node.group === 'drug' ? 'status' : 'blue'}`;
    }
    if (descEl) descEl.textContent = node.info;

    if (relsEl) {
      const connected = links.filter(l => l.source === node.id || l.target === node.id);
      relsEl.innerHTML = connected.map(l => {
        const otherId = l.source === node.id ? l.target : l.source;
        return `<div class="tag-chip"><span>${l.type}</span> <strong>${otherId}</strong> (${(l.weight * 100).toFixed(0)}%)</div>`;
      }).join('');
    }
  }

  window.addEventListener('resize', resize);
  setTimeout(() => {
    resize();
    updateKGPanel(selectedNode);
  }, 150);
  drawKG();
}

/* -------------------------------------------------------------------
   5. LAB 4: HRCT PROGRESSION & FIBROSIS SLIDER
   ------------------------------------------------------------------- */
function initHRCTLab() {
  const canvasBaseline = document.getElementById('hrctBaselineCanvas');
  const canvasFollowup = document.getElementById('hrctFollowupCanvas');
  if (!canvasBaseline || !canvasFollowup) return;

  const ctxB = canvasBaseline.getContext('2d');
  const ctxF = canvasFollowup.getContext('2d');

  let followupMonth = 6;
  let showOverlay = true;

  function drawHRCTSlice(ctx, month, isFollowup) {
    const rect = isFollowup ? canvasFollowup.getBoundingClientRect() : canvasBaseline.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W === 0 || H === 0) return;

    ctx.fillStyle = '#02050b';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(200, 220, 245, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.5, W * 0.44, H * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(230, 240, 255, 0.8)';
    ctx.fillRect(W * 0.48, H * 0.15, W * 0.04, H * 0.06);
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.78, W * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#060a12';
    ctx.beginPath();
    ctx.ellipse(W * 0.32, H * 0.52, W * 0.18, H * 0.28, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.68, H * 0.52, W * 0.18, H * 0.28, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(180, 200, 225, 0.5)';
    ctx.beginPath();
    ctx.ellipse(W * 0.52, H * 0.48, W * 0.14, H * 0.18, 0.2, 0, Math.PI * 2);
    ctx.fill();

    const severity = isFollowup ? (month === 6 ? 0.65 : 0.92) : 0.35;
    ctx.strokeStyle = showOverlay ? (isFollowup ? '#e11d48' : '#d97706') : 'rgba(230, 240, 255, 0.5)';
    ctx.lineWidth = 1.2;

    const densityPoints = Math.round(severity * 140);
    for (let i = 0; i < densityPoints; i++) {
      const angle = (i / densityPoints) * Math.PI * 2;
      const isRight = i % 2 === 0;
      const cx = isRight ? W * 0.32 : W * 0.68;
      const cy = H * 0.52;
      const rx = W * 0.14;
      const ry = H * 0.24;

      const px = cx + Math.cos(angle) * (rx * (0.8 + Math.sin(i * 3) * 0.18));
      const py = cy + Math.sin(angle) * (ry * (0.8 + Math.cos(i * 3) * 0.18));

      ctx.beginPath();
      ctx.arc(px, py, 2.5 + Math.random() * 2, 0, Math.PI * 2);
      ctx.stroke();

      if (severity > 0.5 && i % 4 === 0) {
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 10.5px var(--font-mono)';
    ctx.fillText(isFollowup ? `MONTH +${month}` : 'BASELINE (M0)', 12, 22);

    if (showOverlay) {
      ctx.fillStyle = isFollowup ? '#f43f5e' : '#f59e0b';
      ctx.fillText(isFollowup ? 'PROGRESSION MASK' : 'FIBROSIS PATTERN', 12, 36);
    }
  }

  function renderAll() {
    drawHRCTSlice(ctxB, 0, false);
    drawHRCTSlice(ctxF, followupMonth, true);

    const changeEl = document.getElementById('hrctDeltaScore');
    if (changeEl) {
      changeEl.textContent = followupMonth === 6 ? 'Month +6 Follow-Up' : 'Month +12 Follow-Up';
    }
  }

  const m6Btn = document.getElementById('hrctMonth6Btn');
  const m12Btn = document.getElementById('hrctMonth12Btn');
  if (m6Btn && m12Btn) {
    m6Btn.addEventListener('click', () => {
      m6Btn.classList.add('active');
      m12Btn.classList.remove('active');
      followupMonth = 6;
      renderAll();
    });
    m12Btn.addEventListener('click', () => {
      m12Btn.classList.add('active');
      m6Btn.classList.remove('active');
      followupMonth = 12;
      renderAll();
    });
  }

  const toggleOverlayBtn = document.getElementById('hrctToggleOverlay');
  if (toggleOverlayBtn) {
    toggleOverlayBtn.addEventListener('click', () => {
      showOverlay = !showOverlay;
      toggleOverlayBtn.classList.toggle('active', showOverlay);
      renderAll();
    });
  }

  window.addEventListener('resize', renderAll);
  setTimeout(renderAll, 150);
}

/* -------------------------------------------------------------------
   6. LAB 6: INDOOR ROBOTICS SLAM & OCCUPANCY GRID MAPPING SIMULATOR
   ------------------------------------------------------------------- */
function initSLAMLab() {
  const canvas = document.getElementById('slamCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let isPatrolling = true;
  let maxRangeMeters = 8.0;
  let beamCount = 120;
  let pathMode = 'loop';
  let loopClosureCount = 14;

  const gridW = 100;
  const gridH = 75;
  // 0: unexplored, 1: free space, 2: wall/occupied
  const occupancyGrid = new Uint8Array(gridW * gridH);

  // Define clinical unit floorplan walls in normalized coordinates [0, 1]
  const walls = [
    // Outer perimeter
    { x1: 0.05, y1: 0.08, x2: 0.95, y2: 0.08 },
    { x1: 0.95, y1: 0.08, x2: 0.95, y2: 0.92 },
    { x1: 0.95, y1: 0.92, x2: 0.05, y2: 0.92 },
    { x1: 0.05, y1: 0.92, x2: 0.05, y2: 0.08 },

    // Left ward partition with doorway
    { x1: 0.32, y1: 0.08, x2: 0.32, y2: 0.42 },
    { x1: 0.32, y1: 0.58, x2: 0.32, y2: 0.92 },

    // Right suite partition with doorway
    { x1: 0.66, y1: 0.08, x2: 0.66, y2: 0.36 },
    { x1: 0.66, y1: 0.52, x2: 0.66, y2: 0.70 },
    { x1: 0.66, y1: 0.70, x2: 0.95, y2: 0.70 },

    // Clinical pillars in left ward
    { x1: 0.16, y1: 0.24, x2: 0.22, y2: 0.24 },
    { x1: 0.22, y1: 0.24, x2: 0.22, y2: 0.30 },
    { x1: 0.22, y1: 0.30, x2: 0.16, y2: 0.30 },
    { x1: 0.16, y1: 0.30, x2: 0.16, y2: 0.24 },

    { x1: 0.16, y1: 0.70, x2: 0.22, y2: 0.70 },
    { x1: 0.22, y1: 0.70, x2: 0.22, y2: 0.76 },
    { x1: 0.22, y1: 0.76, x2: 0.16, y2: 0.76 },
    { x1: 0.16, y1: 0.76, x2: 0.16, y2: 0.70 },

    // Central nurse island desk
    { x1: 0.46, y1: 0.32, x2: 0.54, y2: 0.32 },
    { x1: 0.54, y1: 0.32, x2: 0.54, y2: 0.68 },
    { x1: 0.54, y1: 0.68, x2: 0.46, y2: 0.68 },
    { x1: 0.46, y1: 0.68, x2: 0.46, y2: 0.32 }
  ];

  // Pre-seed some initial exploration so the canvas starts with rich detail
  for (let y = 15; y < 60; y++) {
    for (let x = 12; x < 88; x++) {
      if (Math.random() < 0.35) {
        occupancyGrid[y * gridW + x] = 1;
      }
    }
  }

  // Patrol waypoints
  const loopWaypoints = [
    { x: 0.18, y: 0.50 },
    { x: 0.24, y: 0.82 },
    { x: 0.39, y: 0.82 },
    { x: 0.39, y: 0.50 },
    { x: 0.39, y: 0.20 },
    { x: 0.60, y: 0.20 },
    { x: 0.60, y: 0.44 },
    { x: 0.80, y: 0.44 },
    { x: 0.80, y: 0.20 },
    { x: 0.60, y: 0.20 },
    { x: 0.39, y: 0.20 },
    { x: 0.39, y: 0.50 },
    { x: 0.24, y: 0.50 }
  ];

  const roomWaypoints = [
    { x: 0.18, y: 0.20 },
    { x: 0.18, y: 0.82 },
    { x: 0.39, y: 0.82 },
    { x: 0.39, y: 0.20 },
    { x: 0.60, y: 0.20 },
    { x: 0.82, y: 0.44 },
    { x: 0.82, y: 0.82 },
    { x: 0.39, y: 0.50 }
  ];

  let currentWaypoints = loopWaypoints;
  let targetWpIndex = 0;
  let robot = {
    x: loopWaypoints[0].x,
    y: loopWaypoints[0].y,
    heading: 0,
    trail: []
  };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    renderSLAM();
  }

  // Ray-segment intersection
  function rayIntersect(px, py, angle, maxDist) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closestDist = maxDist;
    let hitX = px + dx * maxDist;
    let hitY = py + dy * maxDist;
    let hitWall = false;

    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const x1 = w.x1, y1 = w.y1, x2 = w.x2, y2 = w.y2;
      const v1x = px - x1, v1y = py - y1;
      const v2x = x2 - x1, v2y = y2 - y1;
      const v3x = -dy, v3y = dx;

      const dot = v2x * v3x + v2y * v3y;
      if (Math.abs(dot) < 0.00001) continue;

      const t1 = (v2x * v1y - v2y * v1x) / dot;
      const t2 = (v1x * v3x + v1y * v3y) / dot;

      if (t1 >= 0 && t1 < closestDist && t2 >= 0 && t2 <= 1) {
        closestDist = t1;
        hitX = px + dx * t1;
        hitY = py + dy * t1;
        hitWall = true;
      }
    }

    return { dist: closestDist, x: hitX, y: hitY, hit: hitWall };
  }

  function markOccupancy(rx, ry, hx, hy, hit) {
    const steps = 16;
    for (let s = 0; s < steps; s++) {
      const frac = s / steps;
      const cx = Math.floor((rx + (hx - rx) * frac) * gridW);
      const cy = Math.floor((ry + (hy - ry) * frac) * gridH);
      if (cx >= 0 && cx < gridW && cy >= 0 && cy < gridH) {
        const idx = cy * gridW + cx;
        if (occupancyGrid[idx] === 0) occupancyGrid[idx] = 1;
      }
    }
    if (hit) {
      const hgx = Math.floor(hx * gridW);
      const hgy = Math.floor(hy * gridH);
      if (hgx >= 0 && hgx < gridW && hgy >= 0 && hgy < gridH) {
        occupancyGrid[hgy * gridW + hgx] = 2;
      }
    }
  }

  function stepSimulation() {
    if (!isPatrolling) return;

    const target = currentWaypoints[targetWpIndex];
    const dx = target.x - robot.x;
    const dy = target.y - robot.y;
    const dist = Math.hypot(dx, dy);

    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - robot.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    robot.heading += angleDiff * 0.10;

    const moveStep = Math.min(dist, 0.0026);
    robot.x += Math.cos(robot.heading) * moveStep;
    robot.y += Math.sin(robot.heading) * moveStep;

    if (dist < 0.02) {
      targetWpIndex = (targetWpIndex + 1) % currentWaypoints.length;
      if (targetWpIndex === 0) {
        loopClosureCount++;
        const loopEl = document.getElementById('slamLoopClosures');
        if (loopEl) loopEl.textContent = `${loopClosureCount} Validated`;
      }
    }

    if (robot.trail.length === 0 || Math.hypot(robot.x - robot.trail[robot.trail.length - 1].x, robot.y - robot.trail[robot.trail.length - 1].y) > 0.012) {
      robot.trail.push({ x: robot.x, y: robot.y });
      if (robot.trail.length > 85) robot.trail.shift();
    }

    let exploredCount = 0;
    for (let i = 0; i < occupancyGrid.length; i++) {
      if (occupancyGrid[i] > 0) exploredCount++;
    }
    const mapCoveragePercent = Math.min(97.2, (exploredCount / (gridW * gridH)) * 135);
    const covEl = document.getElementById('slamMapCoverage');
    if (covEl) covEl.textContent = `${mapCoveragePercent.toFixed(1)}%`;

    const teleEl = document.getElementById('slamTelemetryPose');
    if (teleEl) {
      const pxMeters = ((robot.x - 0.5) * 16).toFixed(2);
      const pyMeters = ((robot.y - 0.5) * 12).toFixed(2);
      const deg = Math.round((robot.heading * 180 / Math.PI + 360) % 360);
      teleEl.textContent = `x: ${pxMeters >= 0 ? '+' : ''}${pxMeters}m | y: ${pyMeters >= 0 ? '+' : ''}${pyMeters}m | θ: ${deg}°`;
    }
  }

  function renderSLAM() {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    if (W === 0 || H === 0) return;

    // Floor background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, W, H);

    // Explored Occupancy Grid
    const cellW = W / gridW;
    const cellH = H / gridH;
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const val = occupancyGrid[gy * gridW + gx];
        if (val === 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
        } else if (val === 2) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    // Floor grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Walls
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      ctx.beginPath();
      ctx.moveTo(w.x1 * W, w.y1 * H);
      ctx.lineTo(w.x2 * W, w.y2 * H);
      ctx.stroke();
    }

    // Room labels
    ctx.font = '600 9.5px var(--font-mono)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.fillText('CLINICAL WARD A', W * 0.08, H * 0.18);
    ctx.fillText('NURSE CORRIDOR', W * 0.38, H * 0.14);
    ctx.fillText('EXAM SUITE 2', W * 0.70, H * 0.82);
    ctx.fillText('MED ROBOT DOCK', W * 0.70, H * 0.18);

    // LiDAR Rays
    const normalizedMaxDist = maxRangeMeters / 18.0;
    const rx = robot.x;
    const ry = robot.y;
    const rxPx = rx * W;
    const ryPx = ry * H;

    const angleStep = (Math.PI * 2) / beamCount;
    ctx.lineWidth = 1;

    for (let b = 0; b < beamCount; b++) {
      const angle = b * angleStep + robot.heading;
      const hit = rayIntersect(rx, ry, angle, normalizedMaxDist);

      markOccupancy(rx, ry, hit.x, hit.y, hit.hit);

      const hxPx = hit.x * W;
      const hyPx = hit.y * H;

      // Laser ray line
      ctx.strokeStyle = hit.hit ? 'rgba(56, 189, 248, 0.22)' : 'rgba(14, 165, 233, 0.06)';
      ctx.beginPath();
      ctx.moveTo(rxPx, ryPx);
      ctx.lineTo(hxPx, hyPx);
      ctx.stroke();

      // Laser hit contact dot
      if (hit.hit) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(hxPx, hyPx, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Trajectory path
    if (robot.trail.length > 1) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(robot.trail[0].x * W, robot.trail[0].y * H);
      for (let i = 1; i < robot.trail.length; i++) {
        ctx.lineTo(robot.trail[i].x * W, robot.trail[i].y * H);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Robot chassis
    ctx.save();
    ctx.translate(rxPx, ryPx);
    ctx.rotate(robot.heading);

    // Robot body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Heading direction
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();

    // Laser turret center
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function loop() {
    stepSimulation();
    renderSLAM();
    requestAnimationFrame(loop);
  }

  // Controls
  const playBtn = document.getElementById('slamPlayBtn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      isPatrolling = !isPatrolling;
      playBtn.textContent = isPatrolling ? '⏸ Pause Patrol' : '▶ Resume Patrol';
      playBtn.style.background = isPatrolling ? 'var(--ink)' : 'var(--bg-subtle)';
      playBtn.style.color = isPatrolling ? '#ffffff' : 'var(--ink)';
    });
  }

  const resetBtn = document.getElementById('slamResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      occupancyGrid.fill(0);
      robot.trail = [];
      loopClosureCount = 0;
      const loopEl = document.getElementById('slamLoopClosures');
      if (loopEl) loopEl.textContent = '0 Validated';
      renderSLAM();
    });
  }

  const rangeSlider = document.getElementById('slamRangeSlider');
  const rangeDisplay = document.getElementById('slamRangeVal');
  if (rangeSlider) {
    rangeSlider.addEventListener('input', (e) => {
      maxRangeMeters = parseFloat(e.target.value);
      if (rangeDisplay) rangeDisplay.textContent = `${maxRangeMeters.toFixed(1)} m`;
    });
  }

  const beamBtns = document.querySelectorAll('.slam-beams-btn');
  beamBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      beamBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      beamCount = parseInt(btn.getAttribute('data-beams'), 10) || 120;
    });
  });

  const pathBtns = document.querySelectorAll('.slam-path-btn');
  pathBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pathBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pathMode = btn.getAttribute('data-path');
      currentWaypoints = pathMode === 'rooms' ? roomWaypoints : loopWaypoints;
      targetWpIndex = 0;
    });
  });

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 150);
  loop();
}

