const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');

// Game State
let frames = 0;
let score = 0;
let isRunning = true;
let isGameOver = false;
let gameSpeed = 3;
let gameState = 'INTRO';
let introTimer = 0;
let startDelay = 0;
let particles = [];
let cracks = [];
// FPS Control
let lastTime = 0;
const fps = 60;
const fpsInterval = 1000 / fps;

// Assets
const planeImg = new Image();
planeImg.src = 'plane.svg';

const towerImg = new Image();
towerImg.src = 'log.svg';

const cloudImg = new Image();
cloudImg.src = 'cloud.svg';

// Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Resize Canvas
function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// Environment System
const env = {
    // CENÁRIOS (LEGENDA)
    scenarios: {
        DAY_CLEAR: { bg: 'linear-gradient(to bottom, #4facfe, #00f2fe)', rain: false },
        NIGHT_CLEAR: { bg: 'linear-gradient(to bottom, #0f2027, #203a43, #2c5364)', rain: false },
        DAY_RAIN: { bg: 'linear-gradient(to bottom, #3a6073, #3a7bd5)', rain: true },
        NIGHT_RAIN: { bg: 'linear-gradient(to bottom, #000000, #434343)', rain: true }
    },

    // SEQUENCIA DE EVENTOS (A cada 50 pontos)
    // 0 = 0-49, 1 = 50-99, 2 = 100-149, etc...
    sequence: [
        'DAY_CLEAR',    // 0
        'NIGHT_CLEAR',  // 50
        'NIGHT_RAIN',   // 100
        'NIGHT_CLEAR',  // 150
        'DAY_CLEAR',    // 200
        'DAY_RAIN'      // 250
    ],

    currentLevel: -1,
    raining: false,
    rainDrops: [],

    // Cloud System
    clouds: [],

    update: function () {
        // Calculate current stage based on score (50 points per stage)
        const newLevel = Math.floor(score / 50);

        if (newLevel > this.currentLevel) {
            this.currentLevel = newLevel;
            this.applyScenario(this.currentLevel);
        }

        // Force update scenario if in Intro/Menu to ensure correct background
        if (gameState === 'INTRO') {
            this.applyScenarioByName('NIGHT_RAIN');
        } else if (gameState === 'MENU') {
            this.applyScenarioByName('DAY_CLEAR');
        }

        // Clouds (Always active but style/opacity could change? For now standard)
        this.manageClouds();
        this.drawClouds();

        if (this.raining) {
            this.manageRain();
            this.drawRain();
            this.manageLightning(); // Check for lightning
        } else {
            this.lightning.active = false; // Stop if rain stops
        }

        // Always draw lightning if active (it might be fading out)
        if (this.lightning.active) {
            this.drawLightning();
        }
    },

    applyScenarioByName: function (key) {
        const scenario = this.scenarios[key];
        if (scenario) {
            container.style.background = scenario.bg;
            this.raining = scenario.rain;
        }
    },

    applyScenario: function (levelIndex) {
        const safeIndex = levelIndex % this.sequence.length;
        const key = this.sequence[safeIndex];
        this.applyScenarioByName(key);
    },

    // Lightning System
    lightning: {
        active: false,
        timer: 0,
        x: 0,
        flashOpacity: 0
    },

    manageLightning: function () {
        // Random chance to start lightning
        if (!this.lightning.active && Math.random() < 0.005) { // 0.5% chance per frame (~once every 3-4 sec at 60fps)
            this.lightning.active = true;
            this.lightning.timer = 10; // Lasts 10 frames
            this.lightning.x = Math.random() * canvas.width;
            this.lightning.flashOpacity = 0.5;
        }

        if (this.lightning.active) {
            this.lightning.timer--;
            if (this.lightning.timer <= 0) {
                this.lightning.active = false;
            }
        }
    },

    drawLightning: function () {
        // 1. Flash
        if (this.lightning.timer > 5) { // Flash only at start
            ctx.fillStyle = `rgba(255, 255, 255, ${this.lightning.flashOpacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 2. Bolt
        if (this.lightning.timer > 0) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'white';

            ctx.beginPath();
            ctx.moveTo(this.lightning.x, 0);

            let lx = this.lightning.x;
            let ly = 0;

            // Random zig-zag down
            while (ly < canvas.height) {
                lx += (Math.random() - 0.5) * 50; // Zig zag x
                ly += Math.random() * 50 + 20;    // Step y
                ctx.lineTo(lx, ly);
            }

            ctx.stroke();

            // Reset shadow
            ctx.shadowBlur = 0;
        }
    },

    manageClouds: function () {
        // Standard speed for clouds
        const speedMult = 1;

        if (frames % Math.ceil(120 / speedMult) === 0) {
            this.clouds.push({
                x: canvas.width,
                y: Math.random() * (canvas.height / 2),
                w: 80 + Math.random() * 40,
                h: 50 + Math.random() * 20,
                speed: (0.5 + Math.random() * 1) * speedMult
            });
        }

        for (let i = 0; i < this.clouds.length; i++) {
            let c = this.clouds[i];
            c.x -= c.speed;
            if (c.x + c.w < 0) {
                this.clouds.shift();
                i--;
            }
        }
    },

    drawClouds: function () {
        if (!cloudImg.complete) return;
        for (let c of this.clouds) ctx.drawImage(cloudImg, c.x, c.y, c.w, c.h);
    },
    manageRain: function () {
        if (frames % 2 === 0) { // Add new drops
            this.rainDrops.push({
                x: Math.random() * canvas.width,
                y: -20,
                l: Math.random() * 20 + 10,
                v: Math.random() * 5 + 10
            });
        }
        // Move drops
        for (let i = 0; i < this.rainDrops.length; i++) {
            let r = this.rainDrops[i];
            r.y += r.v;
            r.x -= 2; // Wind effect
            if (r.y > canvas.height) {
                this.rainDrops.splice(i, 1);
                i--;
            }
        }
    },
    drawRain: function () {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let r of this.rainDrops) {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - 1, r.y + r.l);
        }
        ctx.stroke();
    },

    // FX System
    createParticles: function (x, y, type) {
        const count = type === 'fire' ? 5 : 2;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 2,
                vy: type === 'fire' ? -Math.random() * 3 - 1 : -Math.random() * 1 - 2,
                life: 1.0,
                color: type === 'fire' ? `rgb(255, ${Math.floor(Math.random() * 150)}, 0)` : 'rgba(50, 50, 50, 0.5)',
                size: Math.random() * 10 + 5,
                type: type
            });
        }
    },

    createExplosion: function (x, y) {
        // Boom! 30 particles burst
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: `rgb(255, ${Math.floor(Math.random() * 200)}, 0)`,
                size: Math.random() * 20 + 5,
                type: 'fire'
            });
        }
    },

    drawParticles: function () {
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.type === 'smoke') p.size += 0.2;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            if (p.life <= 0) {
                particles.splice(i, 1);
                i--;
            }
        }
    },

    createCracks: function () {
        cracks = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        // Generate 5-7 main cracks
        for (let i = 0; i < 7; i++) {
            let angle = Math.random() * Math.PI * 2;
            let len = Math.random() * 300 + 200;
            cracks.push({
                x1: centerX,
                y1: centerY,
                x2: centerX + Math.cos(angle) * len,
                y2: centerY + Math.sin(angle) * len
            });
            // Sub-cracks
            if (Math.random() > 0.5) {
                let subAngle = angle + (Math.random() - 0.5);
                let subLen = Math.random() * 100;
                let startDist = Math.random() * (len / 2);
                let sx = centerX + Math.cos(angle) * startDist;
                let sy = centerY + Math.sin(angle) * startDist;
                cracks.push({
                    x1: sx,
                    y1: sy,
                    x2: sx + Math.cos(subAngle) * subLen,
                    y2: sy + Math.sin(subAngle) * subLen
                });
            }
        }
    },

    drawCracks: function () {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let c of cracks) {
            ctx.moveTo(c.x1, c.y1);
            ctx.lineTo(c.x2, c.y2);
        }
        ctx.stroke();
    }
};

// Plane Object
const plane = {
    x: 50,
    y: 150,
    w: 50,
    h: 35, // Approx aspect ratio
    radius: 15, // Collision radius
    velocity: 0,
    gravity: 0.25, // Original Gravity
    jump: 4.6,    // Original Jump
    rotation: 0,

    draw: function () {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        // Rotate based on velocity
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(this.rotation);

        if (planeImg.complete && planeImg.naturalWidth !== 0) {
            ctx.drawImage(planeImg, -this.w / 2, -this.h / 2, this.w, this.h);
        } else {
            // Fallback
            ctx.fillStyle = 'white';
            ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
            ctx.fillStyle = 'red';
            ctx.fillRect(-this.w / 2 + 5, -this.h / 2 + 10, 10, 5); // Windows
        }
        ctx.restore();
    },

    update: function () {
        if (gameState === 'INTRO') {
            // Auto pilot erratic
            this.x += 0; // Don't move forward, just float/wiggle in place or slowly
            // Actually user said "igual a de jogar". In game plane x is static (towers move).
            // So we should keep x static? Or moving slightly? 
            // Previous was x += 2. Let's make it 0 like in MENU or gameplay (relative to screen).
            // But we want it to look like it's flying. Towers move left.
            // If towers don't move in Intro (we disabled them), maybe clouds give speed illusion.
            // Let's keep x static and rely on clouds.
            this.x = 50;
            this.y = 150 + Math.sin(frames * 0.1) * 50; // Wiggle slightly slower
            this.velocity = 0;
            this.rotation = 0;
            return;
        }

        if (gameState === 'MENU') {
            // Auto pilot calm
            this.x = 50;
            this.y = 150 + Math.sin(frames * 0.05) * 20; // Gentle float
            this.velocity = 0;
            this.rotation = 0;
            return;
        }

        // PLAYING
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Floor Collision
        if (this.y + this.h >= canvas.height) {
            this.y = canvas.height - this.h;
            gameOver();
        }

        // Ceiling Collision (Optional)
        // if (this.y < 0) this.y = 0;
    },

    fly: function () {
        this.velocity = -this.jump;
    }
};

// Obstacles (Flags)
const towers = {
    list: [],
    width: 60,
    dx: 3,
    gap: 150,
    colors: ['#00FF00', '#FFFF00', '#0000FF', '#FF0000', '#800080', '#FFFFFF', '#000000', '#808080', '#FFC0CB'], // Green, Yellow, Blue...

    draw: function () {
        for (let t of this.list) {
            const color = t.color || this.colors[0];

            // Draw Poles (Silver/Grey)
            ctx.fillStyle = '#C0C0C0';
            const poleWidth = 10;
            const poleX = t.x + 10;

            ctx.fillRect(poleX, 0, poleWidth, t.top);
            ctx.fillRect(poleX, t.bottom, poleWidth, canvas.height - t.bottom);

            // Draw Flags (Triangular Pennants)
            ctx.fillStyle = color;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;

            // Top Flag
            ctx.beginPath();
            ctx.moveTo(poleX + poleWidth, t.top - 60);
            ctx.lineTo(poleX + poleWidth + 50, t.top - 30); // Tip at 50px
            ctx.lineTo(poleX + poleWidth, t.top);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Bottom Flag
            ctx.beginPath();
            ctx.moveTo(poleX + poleWidth, t.bottom);
            ctx.lineTo(poleX + poleWidth + 50, t.bottom + 30); // Tip at 50px
            ctx.lineTo(poleX + poleWidth, t.bottom + 60);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    },

    update: function () {
        // Only run logic in Playing state
        if (gameState !== 'PLAYING') return;

        // Spawn
        if (frames % 100 === 0) {
            const maxTop = canvas.height - this.gap - 100;
            const minTop = 50;
            const topHeight = Math.random() * (maxTop - minTop) + minTop;

            // Pick random color
            const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];

            this.list.push({
                x: canvas.width,
                top: topHeight,
                bottom: topHeight + this.gap,
                passed: false,
                color: randomColor
            });
        }

        // Move
        for (let i = 0; i < this.list.length; i++) {
            let t = this.list[i];
            t.x -= this.dx;

            // Collision Detection
            const pHit = {
                x: plane.x + 5,
                y: plane.y + 5,
                w: plane.w - 10,
                h: plane.h - 10
            };

            // Hitbox covers Pole + Flag (10 + 10 + 50 = 70 width approx)

            // Top Obstacle Hitbox
            if (pHit.x < t.x + 70 &&
                pHit.x + pHit.w > t.x + 10 &&
                pHit.y < t.top) {
                gameOver();
            }

            // Bottom Obstacle Hitbox
            if (pHit.x < t.x + 70 &&
                pHit.x + pHit.w > t.x + 10 &&
                pHit.y + pHit.h > t.bottom) {
                gameOver();
            }

            // Score
            if (t.x + 110 < plane.x && !t.passed) {
                score += 10;
                scoreEl.innerHTML = `Pontos: ${score}`;
                t.passed = true;

                // Milestone Effect (Every 50 points)
                if (score > 0 && score % 50 === 0) {
                    scoreEl.classList.add('score-pulse');
                    setTimeout(() => {
                        scoreEl.classList.remove('score-pulse');
                    }, 500); // Remove after 0.5s
                }
            }

            // Remove off-screen
            if (t.x + 70 < 0) {
                this.list.shift();
                i--;
            }
        }
    },

    reset: function () {
        this.list = [];
    }
};

// Input
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'Space') {
        if (isRunning) plane.fly();
    }
});
container.addEventListener('pointerdown', () => {
    if (isRunning) plane.fly();
});

// Loops
function loop(timestamp) {
    if (!isRunning) return;

    // Calculate elapsed time since last loop
    if (!lastTime) lastTime = timestamp;
    const elapsed = timestamp - lastTime;

    // Only update if enough time has passed (Limit to 60 FPS)
    if (elapsed > fpsInterval) {
        // Get ready for next frame, adjusting for latency
        lastTime = timestamp - (elapsed % fpsInterval);

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Logic specific to state
        if (gameState === 'INTRO') {
            introTimer++;
            if (introTimer > 180) { // 3 seconds at 60fps
                gameState = 'MENU';
                startScreen.classList.add('active'); // Show menu
                plane.x = 50; // Reset plane position
            }
        }

        // Update
        if (gameState === 'PLAYING') {
            if (startDelay > 0) {
                startDelay--;

                // Draw Countdown
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'black';

                ctx.font = 'bold 40px Arial';
                ctx.fillText("PREPARAR...", canvas.width / 2, canvas.height / 2 - 20);

                const seconds = Math.ceil(startDelay / 60);
                ctx.font = 'bold 80px Arial';
                ctx.fillText(seconds, canvas.width / 2, canvas.height / 2 + 60);

                ctx.textAlign = 'start'; // Reset alignment
                ctx.shadowBlur = 0;

            } else {
                plane.update();
                towers.update();
            }
        } else if (gameState === 'GAMEOVER') {
            plane.draw(); // Draw static plane (crashed)
            towers.draw();

            // FX (Explosion handles initial burst, this handles burning)
            env.createParticles(plane.x + plane.w / 2, plane.y + plane.h, 'fire');
            if (frames % 5 === 0) env.createParticles(plane.x + plane.w / 2, plane.y + plane.h / 2, 'smoke');

            env.drawParticles();
            env.drawCracks();

            // Crash Physics (Fall to ground)
            if (plane.y + plane.h < canvas.height) {
                plane.y += 5; // Fall fast
                plane.rotation = Math.PI / 4; // Nose down
            } else {
                plane.y = canvas.height - plane.h;
            }
        } else {
            // Intro / Menu
            plane.update();
            towers.update();
        }

        env.update(); // Background and Rain
        frames++;

        // Draw always
        if (gameState === 'PLAYING' && startDelay <= 0) towers.draw();
        if (gameState !== 'GAMEOVER') plane.draw();
    }

    // Continue loop
    requestAnimationFrame(loop);
}

// Control
function startGame() {
    // Allow start from INTRO (skips intro) or MENU or GAMEOVER
    if (gameState === 'INTRO' || gameState === 'MENU' || gameState === 'GAMEOVER') {
        startScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');

        gameState = 'PLAYING';
        plane.y = 150;
        plane.velocity = 0;
        towers.reset();
        towers.dx = 3; // Reset to Speed 3
        score = 0;
        frames = 0;
        scoreEl.innerHTML = 'Pontos: 0';
        env.currentLevel = -1;
        env.raining = false;
        env.rainDrops = [];
        env.clouds = [];
        env.update();

        startDelay = 180; // 3 seconds delay
        isGameOver = false;

        // Loop is already running globally! Do not call it again.
        // requestAnimationFrame(loop); 
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    isGameOver = true;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');

    // Impact Effects
    env.createCracks();
    env.createExplosion(plane.x + plane.w / 2, plane.y + plane.h / 2);
}

// Global loop kick-off
// We need to ensure loop runs for INTRO and MENU even if isGameOver is false.
// Let's adjust the loop function condition above or ensure isGameOver is only true strictly when we want stop.
// Actually, for Menu animation, we need the loop running.
// So let's fix the loop condition too.


// Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Init
resize();
requestAnimationFrame(loop); // Start with valid timestamp from browser
