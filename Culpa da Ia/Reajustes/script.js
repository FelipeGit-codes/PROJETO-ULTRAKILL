// --- CONFIGURAÇÃO DE INFRAESTRUTURA E DOM ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const flashScreen = document.getElementById('flash-screen');
const decayWarning = document.getElementById('decay-warning');
const rankText = document.getElementById('rank-text');
const stylePtsDisplay = document.getElementById('style-pts');
const btnAutoCoin = document.getElementById('btn-auto-coin');

// Cache para textos das abas
const loreText = document.getElementById('lore-text');
const weaponText = document.getElementById('weapon-text');
const beastText = document.getElementById('beast-text');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- BANCO DE DADOS (DATAWARE) ---
const loreData = {
    v1: "PROJETO V1: Chassi experimental supremo de combate móvel. Ele não possui blindagem pesada secundária porque se repara em tempo real absorvendo o sangue que espirra diretamente de suas vítimas.",
    humanidade: "EXTINÇÃO TOTAL: A humanidade evaporou em guerras climáticas e cibernéticas. O inferno, faminto por almas e entretenimento, abriu suas portas para receber os robôs de guerra automatizados.",
    inferno: "HELL IS ALIVE: O inferno altera labirintos, ressuscita mortos e teleporta inimigos apenas para prolongar o espetáculo sangrento fornecido pelas máquinas de aço."
};

const weaponData = {
    piercer: "REVOLVER [PIERCER]: Disparador de alta frequência. Seu tiro interage com moedas metálicas lançadas no ar, criando trajetórias ricocheteantes com mira automática teleporporcional.",
    core: "CORE SHOTGUN: Dispara balotes estilhaçantes de plasma pesado. Causa dano massivo à queima-roupa e espalha projéteis destrutivos em cone.",
    nailgun: "ATTRACTOR NAILGUN: Metralhadora giratória pneumática de pregos superaquecidos. Dispara rajadas massivas em altíssima velocidade para cravar e rasgar blindagens.",
    rpg: "FREEZEFRAME BAZOOKA: Lançador de foguetes pesados anti-matéria. Dispara mísseis maciços que causam detonações térmicas devastadoras de grande área.",
    saw: "SAWBLADE LAUNCHER: Dispara lâminas de serra circulares magnéticas que ganham velocidade cortante linear contínua, triturando alvos orgânicos."
};

const beastData = {
    filth: "FILTH (HUSK): Criatura rastejante sem cérebro, movida apenas pela fome pura de rasgar fios e carne mecânica.",
    v2: "PROJETO V2: Irmão gêmeo do V1, mas construído com blindagem reforçada tradicional em vez de absorção de sangue por contato. Muito ágil e usa as mesmas armas que você.",
    gabriel: "GABRIEL: O Apóstolo Supremo do Ódio. Anjo guerreiro de asas neon puras encarregado de caçar e decapitar máquinas pecadoras nas camadas inferiores.",
    eyes: "FLYING EYES: Manifestações demoníacas oculares flutuantes que vigiam as câmaras do Inferno. Alvos perfeitos para ricochetes baseados em moedas. Vulneráveis a explosões puras de sangue."
};

// --- ESTADOS DO JOGO ---
let coins = [];
let bullets = [];
let particles = [];
let enemies = [];
let currentWeapon = 'revolver';
let stylePoints = 0;
let lastStylePoints = -1; // Para evitar redesenho desnecessário no DOM
let isAutoCoin = false;
let autoCoinInterval = null;

let lastHitTime = Date.now();
const DECAY_DELAY = 5000;

// Delta Time Control
let lastTime = performance.now();

const weaponConfig = {
    revolver: { color: '#00ffff', speed: 38, width: 3, length: 45, style: 150 },
    shotgun: { color: '#ff3700', speed: 25, width: 2, length: 15, style: 80 },
    nailgun: { color: '#00ff66', speed: 28, width: 2, length: 20, style: 40 },
    rpg: { color: '#ffb700', speed: 15, width: 8, length: 30, style: 300 },
    saw: { color: '#0088ff', speed: 18, width: 6, length: 25, style: 180 }
};

// --- ESCUTAS DE EVENTOS MODERNAS (SEM ONCLICK) ---
document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Controle de Abas Dinâmicas
    if (target.matches('[data-action="open-tab"]')) {
        const tabId = target.getAttribute('data-target');
        document.getElementById('main-menu').classList.add('hidden');
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`sec-${tabId}`).classList.remove('hidden');
    }
    
    if (target.matches('.btn-back')) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById('main-menu').classList.remove('hidden');
    }

    // Interações de sub-menus populando dados
    if (target.hasAttribute('data-lore')) loreText.innerText = loreData[target.getAttribute('data-lore')];
    if (target.hasAttribute('data-weapon-info')) weaponText.innerText = weaponData[target.getAttribute('data-weapon-info')];
    if (target.hasAttribute('data-beast')) beastText.innerText = beastData[target.getAttribute('data-beast')];

    // Botões de Ação Direta
    if (target.id === 'btn-spawn-coin' || target.closest('#btn-spawn-coin')) spawnCoin();
    if (target.id === 'btn-auto-coin') toggleAutoCoin();
    if (target.matches('[data-weapon]')) selectWeapon(target.getAttribute('data-weapon'));
});

// Seleção de armas
function selectWeapon(type) {
    currentWeapon = type;
    document.querySelectorAll('.hud-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-weapon') === type);
    });
}

// Atalhos do Teclado
window.addEventListener('keydown', (e) => {
    const keyMap = { '1': 'revolver', '2': 'shotgun', '3': 'nailgun', '4': 'rpg', '5': 'saw' };
    if (keyMap[e.key]) selectWeapon(keyMap[e.key]);
    if (e.key.toLowerCase() === 'f') spawnCoin();
});

function toggleAutoCoin() {
    isAutoCoin = !isAutoCoin;
    clearInterval(autoCoinInterval); // Segurança contra loops órfãos

    if (isAutoCoin) {
        btnAutoCoin.innerText = "> CHUVA AUTO: ATIVADA";
        btnAutoCoin.className = "btn-auto-enabled"; // Gerencie cores via CSS classe
        autoCoinInterval = setInterval(spawnCoin, 100);
    } else {
        btnAutoCoin.innerText = "> CHUVA AUTO: DESATIVADA";
        btnAutoCoin.className = "btn-auto-disabled";
    }
}

function spawnCoin() {
    coins.push({
        x: window.innerWidth * 0.25 + Math.random() * window.innerWidth * 0.4,
        y: window.innerHeight,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 16,
        radius: 10,
        gravity: 0.40,
        angle3d: Math.random() * 5,
        spinSpeed: 0.2 + Math.random() * 0.1
    });
}

function spawnEnemy() {
    if (enemies.length < 10) {
        enemies.push({
            x: Math.random() * (window.innerWidth * 0.6) + window.innerWidth * 0.2,
            y: Math.random() * (window.innerHeight * 0.4) + 80,
            radius: 18,
            pulse: 0,
            speedY: (Math.random() - 0.5) * 1.5
        });
    }
}
setInterval(spawnEnemy, 1000);

// Disparos com Mouse
window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('#weapon-select-hud') || e.target.closest('.menu-container')) return;

    const startX = window.innerWidth * 0.88;
    const startY = window.innerHeight * 0.88;
    const angle = Math.atan2(e.clientY - startY, e.clientX - startX);

    flashScreen.style.opacity = (currentWeapon === 'shotgun' || currentWeapon === 'rpg') ? '0.3' : '0.1';
    setTimeout(() => flashScreen.style.opacity = '0', 45);

    if (currentWeapon === 'shotgun') {
        for (let i = 0; i < 8; i++) {
            let spread = angle + (Math.random() - 0.5) * 0.4;
            fireBullet(startX, startY, spread, weaponConfig.shotgun.speed * (0.8 + Math.random() * 0.4));
        }
    } else if (currentWeapon === 'nailgun') {
        let delay = 0;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                fireBullet(startX, startY, angle + (Math.random() - 0.5) * 0.05, weaponConfig.nailgun.speed);
            }, delay);
            delay += 60;
        }
    } else {
        fireBullet(startX, startY, angle, weaponConfig[currentWeapon].speed);
    }
});

function fireBullet(x, y, angle, speed) {
    const config = weaponConfig[currentWeapon];
    bullets.push({
        x: x, y: y, prevX: x, prevY: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: config.color, width: config.width, length: config.length,
        type: currentWeapon, bounces: 0
    });
}

function createBurst(x, y, color, count = 12, isBlood = false) {
    for (let i = 0; i < count; i++) {
        let pAngle = Math.random() * Math.PI * 2;
        let pSpeed = isBlood ? (Math.random() * 6 + 4) : (Math.random() * 7 + 2);
        particles.push({
            x: x, y: y,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed + (isBlood ? -2 : 0),
            color: color, alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            size: isBlood ? (Math.random() * 4 + 2) : (Math.random() * 3 + 1),
            isBlood: isBlood
        });
    }
}

function triggerChainRicochet(firstCoin) {
    lastHitTime = Date.now();
    let currentX = firstCoin.x;
    let currentY = firstCoin.y;
    
    let remainingCoins = coins.filter(c => c !== firstCoin);
    let chainCount = 1;

    createBurst(currentX, currentY, '#ffffff', 15);
    createBurst(currentX, currentY, '#ffb700', 15);

    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';

    while (remainingCoins.length > 0) {
        let nextCoinIndex = 0;
        let minDist = Math.hypot(remainingCoins[0].x - currentX, remainingCoins[0].y - currentY);

        for (let i = 1; i < remainingCoins.length; i++) {
            let d = Math.hypot(remainingCoins[i].x - currentX, remainingCoins[i].y - currentY);
            if (d < minDist) { minDist = d; nextCoinIndex = i; }
        }

        let nextCoin = remainingCoins[nextCoinIndex];
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(nextCoin.x, nextCoin.y);
        ctx.stroke();

        currentX = nextCoin.x;
        currentY = nextCoin.y;
        chainCount++;

        createBurst(currentX, currentY, '#00ffff', 10);
        addStyle(200 * chainCount);
        remainingCoins.splice(nextCoinIndex, 1);
    }

    if (enemies.length > 0) {
        for (let k = enemies.length - 1; k >= 0; k--) {
            let enemy = enemies[k];
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(enemy.x, enemy.y);
            ctx.stroke();

            currentX = enemy.x;
            currentY = enemy.y;

            createBurst(enemy.x, enemy.y, '#990000', 25, true);
            createBurst(enemy.x, enemy.y, '#ff0033', 20, true);
            
            addStyle(800 * chainCount);
            enemies.splice(k, 1);
        }
    } else {
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(currentX + (Math.random() - 0.5) * 200, -100);
        ctx.stroke();
    }
    
    ctx.restore();
    coins = []; 
}

function addStyle(amount) {
    stylePoints += amount;
}

function updateRankDisplay() {
    // Evita manipulação do DOM caso o valor não tenha mudado de fato
    if (stylePoints === lastStylePoints) return;
    lastStylePoints = stylePoints;

    stylePtsDisplay.innerText = `${String(Math.floor(stylePoints)).padStart(6, '0')} PTS`;

    let rank = 'D';
    let color = '#888';

    if (stylePoints > 60000) { rank = 'ULTRAKILL'; color = '#ff003c'; }
    else if (stylePoints > 35000) { rank = 'SSShitstorm'; color = '#ff4500'; }
    else if (stylePoints > 20000) { rank = 'Supreme'; color = '#ffb700'; }
    else if (stylePoints > 15000) { rank = 'Anarchic'; color = '#cc00ff'; }
    else if (stylePoints > 8000) { rank = 'Brutal'; color = '#00ffff'; }
    else if (stylePoints > 4000) { rank = 'Chaotic'; color = '#00ff95'; }
    else if (stylePoints > 0) { rank = 'Destructive'; color = '#0026ff'; }

    rankText.innerText = rank;
    rankText.style.color = color;
}

// --- LOOP PRINCIPAL DE RENDERIZAÇÃO (ENGINE) ---
function update(currentTime) {
    // Cálculo do Delta Time para normalizar velocidade em qualquer monitor (base 60fps)
    const dt = (currentTime - lastTime) / 16.666;
    lastTime = currentTime;

    ctx.fillStyle = 'rgba(2, 2, 2, 0.28)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sistema de decaimento otimizado
    let timeSinceLastHit = Date.now() - lastHitTime;
    if (timeSinceLastHit > DECAY_DELAY && stylePoints > 0) {
        stylePoints -= 5 * dt; // Decaimento fluido baseado no tempo real
        if (stylePoints < 0) stylePoints = 0;
        if (decayWarning.style.display !== 'block') decayWarning.style.display = 'block';
    } else {
        if (decayWarning.style.display !== 'none') decayWarning.style.display = 'none';
    }
    updateRankDisplay();

    // 1. Inimigos
    for (let i = 0; i < enemies.length; i++) {
        let en = enemies[i];
        en.pulse += 0.08 * dt;
        en.y += en.speedY * dt;

        if (en.y < 50 || en.y > window.innerHeight * 0.5) en.speedY *= -1;

        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#660011';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        let dynamicRadius = en.radius * 0.4 + Math.sin(en.pulse) * 2;
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff003c';
        ctx.fillStyle = '#ff003c';
        ctx.beginPath();
        ctx.arc(en.x, en.y, dynamicRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(en.x - 3, en.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. Moedas
    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i];
        c.x += c.vx * dt; 
        c.y += c.vy * dt; 
        c.vy += c.gravity * dt;
        c.angle3d += c.spinSpeed * dt;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(Math.abs(Math.sin(c.angle3d)), 1);
        ctx.shadowBlur = 20; ctx.shadowColor = '#ffb700';
        ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#ff7700'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();

        if (c.y > canvas.height + 50) coins.splice(i, 1);
    }

    // 3. Projéteis e Colisões Estáveis
    let coinHitIndex = -1;
    let bulletHitIndex = -1;

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.prevX = b.x; b.prevY = b.y;
        b.x += b.vx * dt; 
        b.y += b.vy * dt;

        if (b.type === 'saw') {
            b.bounces += 0.3 * dt;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.bounces);
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12; ctx.shadowColor = b.color;
            
            ctx.beginPath();
            ctx.arc(0, 0, b.width * 2, 0, Math.PI * 2);
            ctx.stroke();
            for(let d=0; d<6; d++) {
                ctx.rotate(Math.PI / 3);
                ctx.beginPath();
                ctx.moveTo(b.width * 2, 0);
                ctx.lineTo(b.width * 3.5, b.width);
                ctx.stroke();
            }
            ctx.restore();
        } else if (b.type === 'rpg') {
            ctx.strokeStyle = b.color; ctx.lineWidth = b.width;
            ctx.beginPath(); ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x - b.vx * 1.2, b.y - b.vy * 1.2);
            ctx.stroke();
            createBurst(b.x - b.vx, b.y - b.vy, '#ff4500', 1);
        } else {
            ctx.save();
            ctx.strokeStyle = b.color; ctx.lineWidth = b.width;
            ctx.shadowBlur = b.type === 'nailgun' ? 5 : 10; ctx.shadowColor = b.color;
            ctx.beginPath();
            let dx = b.x - b.prevX; let dy = b.y - b.prevY;
            ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - dx * 1.6, b.y - dy * 1.6);
            ctx.stroke();
            ctx.restore();
        }

        // Detecta colisão de forma passiva (sem mutar arrays dentro do loop)
        for (let j = coins.length - 1; j >= 0; j--) {
            let c = coins[j];
            if (Math.hypot(b.x - c.x, b.y - c.y) < c.radius + b.width + 15) {
                bulletHitIndex = i;
                coinHitIndex = j;
                break;
            }
        }

        if (bulletHitIndex !== -1) break;

        if (b.x < -100 || b.x > canvas.width + 100 || b.y < -100 || b.y > canvas.height + 100) {
            if (b.type === 'rpg') createBurst(b.x, b.y, '#ff6600', 30);
            bullets.splice(i, 1);
        }
    }

    // Resolve as colisões registradas fora dos escopos de loop
    if (bulletHitIndex !== -1 && coinHitIndex !== -1) {
        let b = bullets[bulletHitIndex];
        let c = coins[coinHitIndex];

        if (b.type === 'rpg') {
            createBurst(c.x, c.y, '#ff003c', 40);
            createBurst(c.x, c.y, '#ffb700', 30);
            addStyle(500);
            coins.splice(coinHitIndex, 1);
            lastHitTime = Date.now();
        } else {
            triggerChainRicochet(c);
        }
        bullets.splice(bulletHitIndex, 1);
    }

    // 4. Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * dt; 
        p.y += p.vy * dt;
        
        if (p.isBlood) p.vy += 0.22 * dt;
        p.alpha -= p.decay * dt;

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();

        if (p.alpha <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(update);
}

// Inicia com carimbo de tempo seguro
requestAnimationFrame((time) => {
    lastTime = time;
    update(time);
});