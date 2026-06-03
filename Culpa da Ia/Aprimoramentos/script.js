const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const flashScreen = document.getElementById('flash-screen');
const rankText = document.getElementById('rank-text');
const stylePtsDisplay = document.getElementById('style-pts');
const bossHud = document.getElementById('boss-hud');
const bossBarFill = document.getElementById('boss-bar-fill');
const bossSubtitle = document.getElementById('boss-subtitle');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpText = document.getElementById('hp-text');
const livesDisplay = document.getElementById('lives-display');
const loreText = document.getElementById('lore-text');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const loreData = {
    minos: "MINOS PRIME // ALMA PRIME\nA manifestação volitiva máxima de um governante cuja recusa em aceitar a tirania divina moldou o próprio Inferno. Aprisionado em uma simetria carnal auto-gerida, sua libertação resulta no colapso cinético imediato de qualquer entidade mecânica invasora.",
    judgement: "SENTENÇA COGNITIVA // COLISÃO VERTICAL\nOs vetores de ataque de Minos Prime ignoram equações padrão de amortecimento balístico. Seus deslocamentos são calculados em tempo zero, gerando fendas volumétricas e colapsos de pressão na zona tridimensional monitorada."
};

let isGameActive = false;
let playerHp = 100;
let playerLives = 3;
let coins = [];
let particles = [];
let projectiles = [];
let currentWeapon = 'revolver';
let stylePoints = 0;
let lastStylePoints = -1;

let pPosX = 0;
let pVelocityX = 0;
let pPosZ = 1.0;
let pVelocityZ = 0;
const FRICTION = 0.82;
const ACCEL = 1.6;

let targetCameraTilt = 0;
let currentCameraTilt = 0;
let keysPressed = {};
let globalTime = 0;
let gunKick = 0;
let gunSway = 0;
let lastTime = performance.now();

let minos = null;
const minosQuotes = ["JUDGEMENT!", "DIE!", "CRUSH!", "PREPARE THYSELF!", "THY END IS NOW!"];

const weaponConfig = {
    revolver: { color: '#22ccff', style: 150, dmg: 1.5 },
    shotgun: { color: '#ff4400', style: 90, beams: 12, dmg: 0.4 },
    nailgun: { color: '#00ff44', style: 50, burst: 4, dmg: 0.25 },
    rpg: { color: '#ffaa00', style: 350, dmg: 5.0 },
    saw: { color: '#0055ff', style: 200, dmg: 2.5 }
};

window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    if (!isGameActive) return;
    const m = { '1': 'revolver', '2': 'shotgun', '3': 'nailgun', '4': 'rpg', '5': 'saw' };
    if (m[e.key]) selectWeapon(m[e.key]);
    if (e.key.toLowerCase() === 'f') spawnCoin();
    if (e.key.toLowerCase() === 'p') summonMinosPrime();
});
window.addEventListener('keyup', (e) => { keysPressed[e.key] = false; });

function resetGameplayState() {
    coins = []; particles = []; projectiles = []; minos = null;
    stylePoints = 0; gunKick = 0; pPosX = 0; pVelocityX = 0; pPosZ = 1.0; pVelocityZ = 0;
    currentCameraTilt = 0; targetCameraTilt = 0; playerHp = 100; playerLives = 3; keysPressed = {};
    bossHud.classList.add('hidden');
    updateHudElements();
}

function updateHudElements() {
    hpBarFill.style.width = `${playerHp}%`;
    hpText.innerText = Math.max(0, Math.floor(playerHp));
    let s = "";
    for(let i=0; i<playerLives; i++) s += "███ ";
    livesDisplay.innerText = s || "NULL";
}

function takeDamage(amt) {
    playerHp -= amt;
    flashScreen.style.opacity = '0.9';
    setTimeout(() => flashScreen.style.opacity = '0', 40);
    if (playerHp <= 0) {
        playerLives--;
        if (playerLives > 0) {
            playerHp = 100;
            stylePoints = Math.max(0, stylePoints - 5000);
        } else {
            isGameActive = false;
            alert("V1 DESTRUCTION // TERMINAL REBOOT REQUIRED");
            document.getElementById('sec-cybergrind').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
            resetGameplayState();
            return;
        }
    }
    updateHudElements();
}

document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.matches('[data-action="open-tab"]')) {
        const tid = b.getAttribute('data-target');
        document.getElementById('main-menu').classList.add('hidden');
        document.querySelectorAll('.content-section, .game-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`sec-${tid}`).classList.remove('hidden');
        if (tid === 'cybergrind') { isGameActive = true; resetGameplayState(); }
        return;
    }
    if (b.matches('.btn-back')) {
        isGameActive = false; resetGameplayState();
        document.querySelectorAll('.content-section, .game-section').forEach(s => s.classList.add('hidden'));
        document.getElementById('main-menu').classList.remove('hidden');
        return;
    }
    if (b.hasAttribute('data-lore')) loreText.innerText = loreData[b.getAttribute('data-lore')];
    if (b.id === 'btn-spawn-coin') spawnCoin();
    if (b.id === 'btn-summon-minos') summonMinosPrime();
    if (b.hasAttribute('data-weapon')) selectWeapon(b.getAttribute('data-weapon'));
});

function selectWeapon(w) {
    currentWeapon = w;
    document.querySelectorAll('.hud-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-weapon') === w);
    });
}

function spawnCoin() {
    if (!isGameActive) return;
    coins.push({
        x: (Math.random() - 0.5) * 300 - pPosX,
        y: canvas.height * 0.3,
        z: pPosZ + 0.15,
        vx: (Math.random() - 0.5) * 8 - pVelocityX,
        vy: -16,
        vz: 0.012,
        grav: 0.5,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        size: 16
    });
}

function summonMinosPrime() {
    if (!isGameActive) return;
    bossHud.classList.remove('hidden');
    bossBarFill.style.width = '100%';
    bossSubtitle.innerText = '"ORDER."';
    minos = {
        x: 0, y: 0, z: pPosZ + 2.8,
        hp: 200, maxHp: 200,
        state: 'idle', stateTimer: 0, quoteTimer: 0,
        animFrame: 0, scale: 220
    };
}

window.addEventListener('mousedown', (e) => {
    if (!isGameActive) return;
    if (e.target.closest('#weapon-select-hud') || e.target.closest('.arena-controls') || e.target.closest('#player-hud')) return;

    gunKick = 65;
    const tx = e.clientX;
    const ty = e.clientY;
    const sx = canvas.width * 0.72;
    const sy = canvas.height;

    if (currentWeapon === 'saw') {
        let angle = Math.atan2(ty - (sy - 150), tx - sx);
        projectiles.push({
            type: 'saw', x: sx, y: sy - 150, z: pPosZ,
            vx: Math.cos(angle) * 36, vy: Math.sin(angle) * 36, vz: 0.01,
            rot: 0, life: 120, dmg: weaponConfig.saw.dmg
        });
    } else if (currentWeapon === 'shotgun') {
        for (let i = 0; i < weaponConfig.shotgun.beams; i++) {
            fireRay(sx, sy, tx + (Math.random() - 0.5) * 250, ty + (Math.random() - 0.5) * 250);
        }
    } else if (currentWeapon === 'nailgun') {
        let d = 0;
        for (let i = 0; i < weaponConfig.nailgun.burst; i++) {
            setTimeout(() => {
                if (isGameActive) fireRay(sx, sy, tx + (Math.random() - 0.5) * 60, ty + (Math.random() - 0.5) * 60);
            }, d);
            d += 50;
        }
    } else {
        fireRay(sx, sy, tx, ty);
    }
});

function fireRay(sx, sy, tx, ty) {
    const cfg = weaponConfig[currentWeapon];
    createVFXLine(sx, sy, tx, ty, '#ffffff', currentWeapon === 'rpg' ? 12 : 3);
    createVFXLine(sx, sy, tx, ty, cfg.color, currentWeapon === 'rpg' ? 20 : 6);
    createGeometrySpark(sx, sy - 180, '#222233', 8, false);

    let hitIdx = -1;
    let hitType = null;

    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i]; let rZ = c.z - pPosZ; if (rZ <= 0) continue;
        let cx = canvas.width / 2 + (c.x + pPosX) / rZ;
        let cy = canvas.height / 2 + c.y / rZ;
        if (Math.hypot(tx - cx, ty - cy) < (c.size / rZ) + 40) { hitIdx = i; hitType = 'coin'; break; }
    }

    if (!hitType && minos) {
        let rZ = minos.z - pPosZ;
        if (rZ > 0) {
            let mx = canvas.width / 2 + (minos.x + pPosX) / rZ;
            let my = canvas.height / 2 + minos.y / rZ;
            let mw = minos.scale / rZ; let mh = (minos.scale * 2.2) / rZ;
            if (tx > mx - mw/2 && tx < mx + mw/2 && ty > my - mh && ty < my) {
                hitType = 'minos';
            }
        }
    }

    if (hitType === 'coin') {
        if (currentWeapon === 'rpg') {
            createGeometrySpark(tx, ty, '#ff3300', 40, false);
            coins.splice(hitIdx, 1);
            stylePoints += 1000;
        } else {
            triggerRicoshot(coins[hitIdx]);
        }
    } else if (hitType === 'minos') {
        damageMinosEntity(cfg.dmg, tx, ty, cfg.style);
    } else if (currentWeapon === 'rpg') {
        createGeometrySpark(tx, ty, '#ff3b00', 60, false);
        if (minos) {
            let rZ = minos.z - pPosZ;
            let mx = canvas.width / 2 + (minos.x + pPosX) / rZ;
            let my = canvas.height / 2 + minos.y / rZ;
            if (Math.hypot(tx - mx, ty - my) < 250) damageMinosEntity(4.0, mx, my - 100, 400);
        }
    }
}

function damageMinosEntity(dmg, hx, hy, style) {
    if (!minos) return;
    minos.hp -= dmg;
    createGeometrySpark(hx, hy, '#8a0005', 25, true);
    createGeometrySpark(hx, hy, '#ff0015', 15, true);

    if (minos.hp <= 0) {
        createGeometrySpark(hx, hy, '#ff002b', 100, true);
        minos = null;
        bossHud.classList.add('hidden');
        stylePoints += 25000;
        alert("PRIME SANCTUM PURGED // CRUSHED");
    } else {
        stylePoints += style;
        bossBarFill.style.width = `${(minos.hp / minos.maxHp) * 100}%`;
    }
}

function triggerRicoshot(coinObj) {
    let rem = coins.filter(c => c !== coinObj);
    let chain = 1;
    let rZ = coinObj.z - pPosZ;
    let cx = canvas.width / 2 + (coinObj.x + pPosX) / rZ;
    let cy = canvas.height / 2 + coinObj.y / rZ;

    createGeometrySpark(cx, cy, '#ffffff', 20, false);

    while (rem.length > 0) {
        let nIdx = 0; let nz = rem[0].z - pPosZ;
        let minDist = Math.hypot((canvas.width/2 + (rem[0].x + pPosX)/nz) - cx, (canvas.height/2 + rem[0].y/nz) - cy);

        for (let i = 1; i < rem.length; i++) {
            let cz = rem[i].z - pPosZ;
            let d = Math.hypot((canvas.width/2 + (rem[i].x + pPosX)/cz) - cx, (canvas.height/2 + rem[i].y/cz) - cy);
            if (d < minDist) { minDist = d; nIdx = i; }
        }

        let nc = rem[nIdx]; let nz2 = nc.z - pPosZ;
        let ncx = canvas.width / 2 + (nc.x + pPosX) / nz2;
        let ncy = canvas.height / 2 + nc.y / nz2;

        createVFXLine(cx, cy, ncx, ncy, '#ffffff', 5);
        createVFXLine(cx, cy, ncx, ncy, '#00ccff', 9);

        cx = ncx; cy = ncy; chain++;
        stylePoints += 800 * chain;
        rem.splice(nIdx, 1);
    }

    if (minos) {
        let mZ = minos.z - pPosZ;
        let mx = canvas.width / 2 + (minos.x + pPosX) / mZ;
        let my = canvas.height / 2 + minos.y / mZ;
        createVFXLine(cx, cy, mx, my - 120, '#ffffff', 6);
        createVFXLine(cx, cy, mx, my - 120, '#ffbb00', 12);
        damageMinosEntity(6.0 * chain, mx, my - 120, 4000 * chain);
    } else {
        createVFXLine(cx, cy, cx + (Math.random() - 0.5) * 500, -300, '#ffffff', 4);
    }
    coins = [];
}

function createVFXLine(sx, sy, tx, ty, color, width) {
    particles.push({ type: 'laser', sx: sx, sy: sy, tx: tx, ty: ty, color: color, width: width, alpha: 1.0 });
}

function createGeometrySpark(x, y, color, count, isBlood = false) {
    for (let i = 0; i < count; i++) {
        let a = Math.random() * Math.PI * 2;
        let spd = Math.random() * 10 + 4;
        particles.push({
            type: 'pixel', x: x, y: y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd + (isBlood ? 3 : 0),
            color: color, alpha: 1.0, decay: Math.random() * 0.05 + 0.02,
            size: isBlood ? (Math.random() * 8 + 4) : (Math.random() * 5 + 2)
        });
    }
}

function updateStyleTracker() {
    if (stylePoints === lastStylePoints) return;
    lastStylePoints = stylePoints;
    stylePtsDisplay.innerText = `${String(Math.floor(stylePoints)).padStart(6, '0')} PTS`;

    let r = 'D'; let c = '#515163';
    if (stylePoints > 80000) { r = 'ULTRAKILL'; c = '#ff003c'; }
    else if (stylePoints > 55000) { r = 'SSShitstorm'; c = '#ff4400'; }
    else if (stylePoints > 35000) { r = 'Supreme'; c = '#ffaa00'; }
    else if (stylePoints > 20000) { r = 'Anarchic'; c = '#cc00ff'; }
    else if (stylePoints > 11000) { r = 'Brutal'; c = '#00ffff'; }
    else if (stylePoints > 6000) { r = 'Chaotic'; c = '#00ff55'; }
    else if (stylePoints > 2000) { r = 'Destructive'; c = '#2255ff'; }

    rankText.innerText = r; rankText.style.color = c;
}

function project3DVertex(vx, vy, vz) {
    let rx = vx + pPosX;
    let rz = vz - pPosZ;
    if (rz <= 0.01) rz = 0.01;
    return {
        x: canvas.width / 2 + rx / rz,
        y: canvas.height / 2 + vy / rz,
        z: rz
    };
}

function drawComplexEnvironment() {
    let horizon = canvas.height * 0.45;
    ctx.fillStyle = '#020104';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.7, '#07020d');
    grad.addColorStop(1, '#1b003a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, horizon);

    let sizeX = 900;
    let sizeZStart = 0.5;
    let sizeZEnd = 4.5;
    let stepsX = 18;
    let stepsZ = 24;

    for (let i = 0; i < stepsZ; i++) {
        let z1 = sizeZStart + (i / stepsZ) * (sizeZEnd - sizeZStart);
        let z2 = sizeZStart + ((i + 1) / stepsZ) * (sizeZEnd - sizeZStart);

        for (let j = 0; j < stepsX; j++) {
            let x1 = -sizeX + (j / stepsX) * (sizeX * 2);
            let x2 = -sizeX + ((j + 1) / stepsX) * (sizeX * 2);

            let p1 = project3DVertex(x1, 350, z1);
            let p2 = project3DVertex(x2, 350, z1);
            let p3 = project3DVertex(x2, 350, z2);
            let p4 = project3DVertex(x1, 350, z2);

            if (p1.y < horizon || p4.y < horizon) continue;

            let isEven = (i + j) % 2 === 0;
            ctx.fillStyle = isEven ? '#08050d' : '#11091c';
            ctx.strokeStyle = '#2d0a4e';
            ctx.lineWidth = Math.max(1, 2 / p1.z);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    }

    let wX1 = -sizeX, wX2 = sizeX;
    let wallSteps = 16;
    ctx.fillStyle = '#05020a';
    ctx.strokeStyle = '#ff0055';

    for (let i = 0; i < wallSteps; i++) {
        let z1 = sizeZStart + (i / wallSteps) * (sizeZEnd - sizeZStart);
        let z2 = sizeZStart + ((i + 1) / wallSteps) * (sizeZEnd - sizeZStart);

        let left1_bot = project3DVertex(wX1, 350, z1);
        let left1_top = project3DVertex(wX1, -200, z1);
        let left2_bot = project3DVertex(wX1, 350, z2);
        let left2_top = project3DVertex(wX1, -200, z2);

        ctx.lineWidth = Math.max(1, 3 / left1_bot.z);
        ctx.beginPath();
        ctx.moveTo(left1_bot.x, left1_bot.y); ctx.lineTo(left1_top.x, left1_top.y);
        ctx.lineTo(left2_top.x, left2_top.y); ctx.lineTo(left2_bot.x, left2_bot.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        let rgt1_bot = project3DVertex(wX2, 350, z1);
        let rgt1_top = project3DVertex(wX2, -200, z1);
        let rgt2_bot = project3DVertex(wX2, 350, z2);
        let rgt2_top = project3DVertex(wX2, -200, z2);

        ctx.beginPath();
        ctx.moveTo(rgt1_bot.x, rgt1_bot.y); ctx.lineTo(rgt1_top.x, rgt1_top.y);
        ctx.lineTo(rgt2_top.x, rgt2_top.y); ctx.lineTo(rgt2_bot.x, rgt2_bot.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
}

function renderAnalyticalModel(polygons) {
    polygons.forEach(p => {
        ctx.fillStyle = p.fill;
        ctx.strokeStyle = p.stroke || '#000000';
        ctx.lineWidth = p.lineWidth || 2;
        ctx.beginPath();
        p.pts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
}

function drawIndustrialWeapon() {
    ctx.save();
    let sx = Math.sin(gunSway) * 18;
    let sy = Math.abs(Math.cos(gunSway)) * 10;
    let bx = canvas.width * 0.72 + sx;
    let by = canvas.height + gunKick + sy;

    if (gunKick > 0) gunKick -= 6;

    let p = [];
    if (currentWeapon === 'revolver') {
        p.push({ fill: '#14171c', pts: [{x: bx, y: by}, {x: bx-60, y: by-160}, {x: bx-110, y: by-165}, {x: bx-50, y: by}] });
        p.push({ fill: '#252a36', pts: [{x: bx-60, y: by-160}, {x: bx-290, y: by-175}, {x: bx-270, y: by-110}, {x: bx-110, y: by-105}] });
        p.push({ fill: '#ffcc00', pts: [{x: bx-110, y: by-165}, {x: bx-170, y: by-168}, {x: bx-160, y: by-120}, {x: bx-110, y: by-115}] });
        p.push({ fill: '#0a0d12', pts: [{x: bx-290, y: by-175}, {x: bx-290, y: by-145}, {x: bx-270, y: by-110}] });
    } else if (currentWeapon === 'shotgun') {
        p.push({ fill: '#2d1f10', pts: [{x: bx, y: by}, {x: bx-80, y: by-140}, {x: bx-140, y: by-140}, {x: bx-60, y: by}] });
        p.push({ fill: '#19191f', pts: [{x: bx-80, y: by-140}, {x: bx-360, y: by-155}, {x: bx-340, y: by-95}, {x: bx-140, y: by-90}] });
        p.push({ fill: '#0d0d12', pts: [{x: bx-360, y: by-155}, {x: bx-360, y: by-125}, {x: bx-340, y: by-95}] });
        p.push({ fill: '#5c4308', pts: [{x: bx-140, y: by-140}, {x: bx-240, y: by-145}, {x: bx-230, y: by-110}, {x: bx-140, y: by-110}] });
    } else if (currentWeapon === 'nailgun') {
        p.push({ fill: '#1e221a', pts: [{x: bx, y: by}, {x: bx-90, y: by-170}, {x: bx-150, y: by-170}, {x: bx-60, y: by}] });
        p.push({ fill: '#333e2b', pts: [{x: bx-90, y: by-170}, {x: bx-340, y: by-170}, {x: bx-310, y: by-70}, {x: bx-150, y: by-70}] });
        p.push({ fill: '#00ff44', pts: [{x: bx-180, y: by-140}, {x: bx-260, y: by-140}, {x: bx-250, y: by-100}, {x: bx-170, y: by-100}] });
        p.push({ fill: '#11150e', pts: [{x: bx-340, y: by-170}, {x: bx-350, y: by-120}, {x: bx-310, y: by-70}] });
    } else if (currentWeapon === 'rpg') {
        p.push({ fill: '#22252b', pts: [{x: bx, y: by}, {x: bx-70, y: by-200}, {x: bx-380, y: by-200}, {x: bx-310, y: by}] });
        p.push({ fill: '#111317', pts: [{x: bx-380, y: by-200}, {x: bx-410, y: by-140}, {x: bx-310, y: by}] });
        p.push({ fill: '#cc5500', pts: [{x: bx-120, y: by-180}, {x: bx-280, y: by-180}, {x: bx-260, y: by-80}, {x: bx-140, y: by-80}] });
    } else if (currentWeapon === 'saw') {
        p.push({ fill: '#1c1c24', pts: [{x: bx, y: by}, {x: bx-110, y: by-190}, {x: bx-310, y: by-190}, {x: bx-260, y: by}] });
        p.push({ fill: '#0f0f14', pts: [{x: bx-310, y: by-190}, {x: bx-340, y: by-100}, {x: bx-260, y: by}] });
        ctx.save();
        ctx.translate(bx - 190, by - 110);
        ctx.rotate(globalTime * 0.5);
        renderWeaponSawGeometry(0, 0, 32);
        ctx.restore();
    }

    renderAnalyticalModel(p);
    ctx.restore();
}

function renderWeaponSawGeometry(x, y, r) {
    ctx.fillStyle = '#636373';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2b36';
    for (let i = 0; i < 16; i++) {
        ctx.rotate((Math.PI * 2) / 16);
        ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r + 18, -6); ctx.lineTo(r + 6, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
}

function updateEngineLoop(currentTime) {
    const dt = (currentTime - lastTime) / 16.666;
    lastTime = currentTime;

    if (!isGameActive) {
        requestAnimationFrame(updateEngineLoop);
        return;
    }

    globalTime += 0.05 * dt;

    if (keysPressed['ArrowLeft'] || keysPressed['a'])  pVelocityX += ACCEL * dt;
    if (keysPressed['ArrowRight'] || keysPressed['d']) pVelocityX -= ACCEL * dt;
    if (keysPressed['ArrowUp'] || keysPressed['w'])    pVelocityZ += 0.002 * dt;
    if (keysPressed['ArrowDown'] || keysPressed['s'])  pVelocityZ -= 0.002 * dt;

    pVelocityX *= Math.pow(FRICTION, dt);
    pVelocityZ *= Math.pow(FRICTION, dt);

    pPosX += pVelocityX * dt;
    pPosZ = Math.max(0.25, Math.min(4.2, pPosZ + pVelocityZ * dt));

    targetCameraTilt = pVelocityX * -0.012;
    currentCameraTilt += (targetCameraTilt - currentCameraTilt) * 0.18 * dt;

    if (Math.abs(pVelocityX) > 0.1 || Math.abs(pVelocityZ) > 0.001) {
        gunSway += 0.25 * dt;
    } else {
        gunSway *= Math.pow(0.82, dt);
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(currentCameraTilt);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    drawComplexEnvironment();

    if (minos) {
        minos.stateTimer += 1 * dt;
        minos.quoteTimer += 1 * dt;
        let rZ = minos.z - pPosZ;

        if (minos.quoteTimer > 180) {
            minos.quoteTimer = 0;
            bossSubtitle.innerText = `"${minosQuotes[Math.floor(Math.random() * minosQuotes.length)]}"`;
        }

        if (minos.state === 'idle') {
            minos.x += (-pPosX - minos.x) * 0.04 * dt;
            minos.z += (pPosZ + 1.2 - minos.z) * 0.02 * dt;
            if (minos.stateTimer > 100) {
                minos.state = Math.random() > 0.5 ? 'teleport' : 'shockwave';
                minos.stateTimer = 0;
            }
        } else if (minos.state === 'teleport') {
            createGeometrySpark(canvas.width/2 + (minos.x + pPosX)/rZ, canvas.height/2 + minos.y/rZ, '#0044ff', 35, false);
            minos.x = -pPosX + (Math.random() - 0.5) * 200;
            minos.z = pPosZ + 0.5;
            minos.state = 'attacking';
            minos.stateTimer = 0;
            bossSubtitle.innerText = '"CRUSH!"';
        } else if (minos.state === 'attacking') {
            if (minos.stateTimer > 25) {
                if (rZ < 0.7 && Math.abs(canvas.width/2 + (minos.x + pPosX)/rZ - canvas.width/2) < 250) {
                    takeDamage(40);
                }
                minos.state = 'idle';
                minos.stateTimer = 0;
                minos.z = pPosZ + 2.2;
            }
        } else if (minos.state === 'shockwave') {
            if (minos.stateTimer > 35) {
                createGeometrySpark(canvas.width/2 + (minos.x + pPosX)/rZ, canvas.height/2 + 200, '#00bfff', 50, false);
                takeDamage(25);
                minos.state = 'idle';
                minos.stateTimer = 0;
            }
        }

        if (rZ > 0.05) {
            let mx = canvas.width / 2 + (minos.x + pPosX) / rZ;
            let my = canvas.height / 2 + minos.y / rZ;
            let mw = minos.scale / rZ;
            let mh = (minos.scale * 2.4) / rZ;

            let polyMinos = [
                { fill: 'rgba(0, 40, 150, 0.45)', stroke: '#00a2ff', lineWidth: Math.max(1.5, 4/rZ), pts: [
                    {x: mx, y: my - mh}, 
                    {x: mx + mw*0.5, y: my - mh*0.78}, 
                    {x: mx + mw*0.6, y: my - mh*0.4}, 
                    {x: mx + mw*0.3, y: my}, 
                    {x: mx - mw*0.3, y: my}, 
                    {x: mx - mw*0.6, y: my - mh*0.4}, 
                    {x: mx - mw*0.5, y: my - mh*0.78}
                ]},
                { fill: '#001133', stroke: '#0077ff', lineWidth: 1, pts: [
                    {x: mx, y: my - mh*0.78}, {x: mx + mw*0.2, y: my - mh*0.4}, {x: mx, y: my}, {x: mx - mw*0.2, y: my - mh*0.4}
                ]}
            ];
            renderAnalyticalModel(polyMinos);

            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00a2ff';
            ctx.beginPath();
            ctx.arc(mx, my - mh * 1.06, Math.max(4, 25 / rZ), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.vy += c.grav * dt;
        c.rotX += 0.2 * dt; c.rotY += 0.15 * dt;

        let rZ = c.z - pPosZ;
        if (c.y > canvas.height + 100 || rZ <= 0.01) { coins.splice(i, 1); continue; }

        let cx = canvas.width / 2 + (c.x + pPosX) / rZ;
        let cy = canvas.height / 2 + c.y / rZ;
        let size = Math.max(2, c.size / rZ);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(Math.abs(Math.sin(c.rotX)), Math.abs(Math.cos(c.rotY)));
        ctx.fillStyle = '#ffcc00';
        ctx.strokeStyle = '#331100';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += 0.5 * dt; p.life -= 1 * dt;

        let rZ = p.z - pPosZ;
        if (p.life <= 0 || rZ <= 0.01) { projectiles.splice(i, 1); continue; }

        let sx = canvas.width / 2 + (p.x + pPosX) / rZ;
        let sy = canvas.height / 2 + p.y / rZ;
        let r = 36 / rZ;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        renderWeaponSawGeometry(0, 0, r);
        ctx.restore();

        if (minos) {
            let mZ = minos.z - pPosZ;
            if (mZ > 0) {
                let mx = canvas.width / 2 + (minos.x + pPosX) / mZ;
                let my = canvas.height / 2 + minos.y / mZ;
                if (Math.hypot(p.x - mx, p.y - (my - 120)) < (200 / mZ)) {
                    damageMinosEntity(p.dmg, mx, my - 120, weaponConfig.saw.style);
                    p.life -= 20;
                }
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        if (p.type === 'laser') {
            p.alpha -= 0.1 * dt;
            if (p.alpha <= 0) { particles.splice(i, 1); continue; }
            ctx.save(); ctx.globalAlpha = p.alpha;
            ctx.strokeStyle = p.color; ctx.lineWidth = p.width;
            ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.tx, p.ty); ctx.stroke();
            ctx.restore();
        } else {
            p.x += p.vx * dt; p.y += p.vy * dt; p.alpha -= p.decay * dt;
            if (p.alpha <= 0) { particles.splice(i, 1); continue; }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
    }

    ctx.restore();

    drawIndustrialWeapon();
    updateStyleTracker();
    requestAnimationFrame(updateEngineLoop);
}

requestAnimationFrame((t) => { lastTime = t; updateEngineLoop(t); });