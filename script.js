// DOM Elements
const gameContainer = document.getElementById('game-container');
const movingCirclesContainer = document.getElementById('moving-circles');
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

// Stats Display Elements
const scoreDisplay = document.getElementById('score');
const quickScore = document.getElementById('quick-score');
const livesDisplay = document.getElementById('lives');
const quickLives = document.getElementById('quick-lives');
const levelDisplay = document.getElementById('level');
const comboCountDisplay = document.getElementById('combo-count');
const quickCombo = document.getElementById('quick-combo');
const maxComboDisplay = document.getElementById('max-combo');
const timerDisplay = document.getElementById('timer');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const challengeDesc = document.getElementById('challenge-desc');
const difficultyTag = document.getElementById('difficulty-level');
const circleCountDisplay = document.getElementById('circle-count');
const bestScoreDisplay = document.getElementById('best-score');
const comboFill = document.getElementById('combo-fill');
const lifetimeDisplay = document.getElementById('lifetime-display');

// Screen Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const finalScore = document.getElementById('final-score');
const finalLevel = document.getElementById('final-level');
const finalCombo = document.getElementById('final-combo');
const finalTime = document.getElementById('final-time');

// Buttons
const startBtn = document.getElementById('start-btn');
const startBtnScreen = document.getElementById('start-btn-screen');
const restartBtn = document.getElementById('restart-btn');
const quickRestart = document.getElementById('quick-restart');
const muteBtn = document.getElementById('mute-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');

// Game variables
let score = 0;
let lives = 3;
let level = 1;
let combo = 0;
let maxCombo = 0;
let gameTime = 0;
let bestScore = localStorage.getItem('movingCirclesBestScore') || 0;
bestScoreDisplay.textContent = bestScore;

// Circle settings
let circleLifetime = 3500;
let baseSpeed = 1.2;
let activeCircles = [];
let gameInterval;
let movementInterval;
let timerInterval;
let animationFrameId;

// Game state
let gameActive = false;
let paused = false;
let muted = false;

// Audio setup - FIXED: Ensure danger sound plays
const sounds = {
    click: new Audio('assets/sounds/click.wav'),
    miss: new Audio('assets/sounds/miss.wav'),
    danger: new Audio('assets/sounds/danger.wav'),
    bgMusic: new Audio('assets/music/background.mp3')
};

sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.3;
sounds.click.volume = 0.5;
sounds.miss.volume = 0.6;
sounds.danger.volume = 0.8; // Louder for emphasis

// Preload audio
Object.values(sounds).forEach(sound => {
    sound.load();
    sound.addEventListener('error', (e) => console.log(`Audio error: ${sound.src}`, e));
});

// Particle System
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createExplosion(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                life: 0.8,
                size: 6 + Math.random() * 6
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= 0.015;
            p.size *= 0.96;
            
            if (p.life <= 0 || p.y > gameContainer.clientHeight) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.fill();
        });
        ctx.restore();
    }
}

const particleSystem = new ParticleSystem();

// Timer functions
function startTimer() {
    gameTime = 0;
    updateTimer();
    timerInterval = setInterval(() => {
        if (!paused && gameActive) {
            gameTime++;
            updateTimer();
        }
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============= ENHANCED DANGER CIRCLE VISIBILITY =============
function createMovingCircle() {
    if (!gameActive || paused) return;
    
    const rand = Math.random();
    let type;
    if (rand < 0.12) type = 'bonus';
    else if (rand > 0.75) type = 'danger'; // Increased danger spawn rate
    else type = 'regular';
    
    const circle = document.createElement('div');
    circle.className = `circle ${type}`;
    
    // Add special attributes for danger circles
    if (type === 'danger') {
        circle.classList.add('danger-highlight');
        // Add pulsing animation
        circle.style.animation = 'dangerPulse 0.8s infinite alternate';
        // Add skull emoji
        const skull = document.createElement('span');
        skull.textContent = '💀';
        skull.style.position = 'absolute';
        skull.style.top = '50%';
        skull.style.left = '50%';
        skull.style.transform = 'translate(-50%, -50%)';
        skull.style.fontSize = '32px';
        skull.style.zIndex = '25';
        circle.appendChild(skull);
    }
    
    if (type === 'bonus') {
        const star = document.createElement('span');
        star.textContent = '✨';
        star.style.position = 'absolute';
        star.style.top = '50%';
        star.style.left = '50%';
        star.style.transform = 'translate(-50%, -50%)';
        star.style.fontSize = '28px';
        star.style.zIndex = '25';
        circle.appendChild(star);
    }
    
    const size = 70; // Even bigger for danger
    
    const side = Math.floor(Math.random() * 4);
    let startX, startY;
    
    switch(side) {
        case 0:
            startX = Math.random() * (gameContainer.clientWidth - size);
            startY = -size;
            break;
        case 1:
            startX = gameContainer.clientWidth;
            startY = Math.random() * (gameContainer.clientHeight - size);
            break;
        case 2:
            startX = Math.random() * (gameContainer.clientWidth - size);
            startY = gameContainer.clientHeight;
            break;
        case 3:
            startX = -size;
            startY = Math.random() * (gameContainer.clientHeight - size);
            break;
    }
    
    circle.style.left = startX + 'px';
    circle.style.top = startY + 'px';
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';
    
    let speed = baseSpeed;
    if (type === 'bonus') speed = baseSpeed * 1.5;
    if (type === 'danger') speed = baseSpeed * 2.0; // Danger moves faster
    speed += level * 0.1;
    
    const centerX = gameContainer.clientWidth / 2;
    const centerY = gameContainer.clientHeight / 2;
    const angleToCenter = Math.atan2(centerY - startY, centerX - startX);
    const randomAngle = angleToCenter + (Math.random() - 0.5) * 0.6;
    
    circle.dataset.vx = Math.cos(randomAngle) * speed;
    circle.dataset.vy = Math.sin(randomAngle) * speed;
    circle.dataset.type = type;
    circle.dataset.created = Date.now();
    
    movingCirclesContainer.appendChild(circle);
    
    const circleData = {
        element: circle,
        type: type,
        vx: parseFloat(circle.dataset.vx),
        vy: parseFloat(circle.dataset.vy),
        timeout: null,
        clickHandler: null
    };
    
    activeCircles.push(circleData);
    
    const lifetime = type === 'danger' ? circleLifetime - 300 : circleLifetime; // Danger disappears faster
    circleData.timeout = setTimeout(() => {
        removeCircle(circleData, 'timeout');
    }, Math.max(1800, lifetime - (level * 80)));
    
    circleData.clickHandler = (e) => {
        e.stopPropagation();
        handleCircleClick(circleData, e);
    };
    
    circle.addEventListener('click', circleData.clickHandler);
    
    circleCountDisplay.textContent = activeCircles.length;
}

// Move circles
function moveCircles() {
    if (!gameActive || paused) return;
    
    activeCircles.forEach(circleData => {
        const circle = circleData.element;
        let left = parseFloat(circle.style.left);
        let top = parseFloat(circle.style.top);
        
        left += circleData.vx;
        top += circleData.vy;
        
        if (left <= -80) left = gameContainer.clientWidth;
        if (left >= gameContainer.clientWidth) left = -80;
        if (top <= -80) top = gameContainer.clientHeight;
        if (top >= gameContainer.clientHeight) top = -80;
        
        circle.style.left = left + 'px';
        circle.style.top = top + 'px';
    });
}

// ============= FIXED: DANGER SOUND PLAYS ON CLICK =============
function handleCircleClick(circleData) {
    if (!gameActive || paused) return;
    
    const circle = circleData.element;
    const type = circleData.type;
    
    const rect = circle.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    
    // DANGER CIRCLE - Play sound and reduce life
    if (type === 'danger') {
        lives -= 1;
        combo = 0;
        
        // ===== FIXED: Force play danger sound =====
        if (!muted) {
            // Create a new audio instance to ensure it plays
            const dangerSound = new Audio('assets/sounds/danger.wav');
            dangerSound.volume = 0.9;
            dangerSound.play().catch(e => {
                console.log('Danger sound retry:', e);
                // Fallback to preloaded sound
                sounds.danger.currentTime = 0;
                sounds.danger.play().catch(err => console.log('Fallback danger sound error:', err));
            });
        }
        
        // Bigger explosion for danger
        particleSystem.createExplosion(x, y, '#ff0000', 24);
        particleSystem.createExplosion(x, y, '#ff8800', 12);
        
        challengeDesc.textContent = '💀 DANGER! -1 LIFE 💀';
        challengeDesc.style.color = '#ff0000';
        challengeDesc.style.fontWeight = '800';
        challengeDesc.style.animation = 'shake 0.3s';
        
        setTimeout(() => {
            challengeDesc.style.color = 'white';
            challengeDesc.style.fontWeight = '500';
            challengeDesc.style.animation = '';
        }, 500);
        
        updateLivesDisplay();
        
        if (lives <= 0) {
            endGame();
            return;
        }
    }
    // REGULAR CIRCLE
    else if (type === 'regular') {
        score += 1;
        combo += 1;
        if (!muted) sounds.click.play();
        particleSystem.createExplosion(x, y, '#ff7b7b', 8);
        challengeDesc.textContent = '🎯 +1 point';
    }
    // BONUS CIRCLE
    else if (type === 'bonus') {
        score += 5;
        combo += 2;
        if (!muted) sounds.click.play();
        particleSystem.createExplosion(x, y, '#ffd700', 16);
        challengeDesc.textContent = '✨ BONUS! +5 ✨';
    }
    
    updateCombo();
    updateScore();
    
    removeCircle(circleData, 'click');
}

// Remove circle
function removeCircle(circleData, reason) {
    const index = activeCircles.indexOf(circleData);
    if (index === -1) return;
    
    const circle = circleData.element;
    
    if (circleData.timeout) clearTimeout(circleData.timeout);
    if (circleData.clickHandler) {
        circle.removeEventListener('click', circleData.clickHandler);
    }
    
    if (circle.parentNode) circle.remove();
    activeCircles.splice(index, 1);
    
    // Handle miss
    if (reason === 'timeout' && circleData.type !== 'bonus') {
        if (!muted) sounds.miss.play();
        lives -= 1;
        combo = 0;
        updateCombo();
        updateLivesDisplay();
        
        if (circleData.type === 'danger') {
            challengeDesc.textContent = '💀 DANGER ESCAPED! -1 LIFE 💀';
        } else {
            challengeDesc.textContent = '⏰ Missed! -1 life';
        }
        
        if (lives <= 0) {
            endGame();
            return;
        }
    }
    
    circleCountDisplay.textContent = activeCircles.length;
}

// Update all displays
function updateScore() {
    scoreDisplay.textContent = score;
    quickScore.textContent = score;
    
    const progress = score % 10;
    const progressPercent = (progress / 10) * 100;
    progressFill.style.width = progressPercent + '%';
    progressText.textContent = `${progress}/10`;
    
    if (score > 0 && score % 10 === 0 && score / 10 >= level) {
        levelUp();
    }
}

function updateLivesDisplay() {
    livesDisplay.textContent = lives;
    quickLives.textContent = lives;
    
    // Flash red when losing life
    if (lives < 3) {
        const livesCard = document.querySelector('.lives-block');
        livesCard.style.animation = 'shake 0.3s';
        setTimeout(() => {
            livesCard.style.animation = '';
        }, 300);
    }
}

function updateCombo() {
    comboCountDisplay.textContent = combo;
    quickCombo.textContent = combo;
    
    const comboPercentage = Math.min((combo / 15) * 100, 100);
    comboFill.style.width = comboPercentage + '%';
    
    if (combo >= 10) {
        comboCountDisplay.style.color = '#ffd700';
        comboFill.style.background = 'linear-gradient(90deg, #ffd700, #ffb347)';
    } else {
        comboCountDisplay.style.color = '#00f0ff';
        comboFill.style.background = 'linear-gradient(90deg, #00f0ff, #b721ff)';
    }
    
    maxCombo = Math.max(maxCombo, combo);
    maxComboDisplay.textContent = maxCombo;
}

function levelUp() {
    level++;
    levelDisplay.textContent = level;
    
    baseSpeed += 0.1;
    circleLifetime = Math.max(2200, circleLifetime - 150);
    
    challengeDesc.textContent = `⚡ LEVEL ${level}! ⚡`;
    challengeDesc.style.color = '#00f0ff';
    challengeDesc.style.fontWeight = '800';
    
    setTimeout(() => {
        challengeDesc.style.color = 'white';
        challengeDesc.style.fontWeight = '500';
    }, 1000);
    
    if (level >= 5) {
        difficultyTag.textContent = 'HARD';
        difficultyTag.style.color = '#ff3860';
        difficultyTag.style.borderColor = '#ff3860';
    } else if (level >= 3) {
        difficultyTag.textContent = 'MEDIUM';
        difficultyTag.style.color = '#ffd700';
        difficultyTag.style.borderColor = '#ffd700';
    }
    
    lifetimeDisplay.textContent = (circleLifetime / 1000).toFixed(1) + 's';
    
    if (gameInterval) {
        clearInterval(gameInterval);
        const spawnRate = Math.max(1000, 1600 - (level * 40));
        gameInterval = setInterval(createMovingCircle, spawnRate);
    }
}

// Animation loop
function animate() {
    if (gameActive && !paused) {
        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particleSystem.update();
        particleSystem.draw(ctx);
    }
    animationFrameId = requestAnimationFrame(animate);
}

// Start game
function startGame() {
    gameActive = true;
    paused = false;
    
    score = 0;
    lives = 3;
    level = 1;
    combo = 0;
    maxCombo = 0;
    baseSpeed = 1.2;
    circleLifetime = 3500;
    
    activeCircles.forEach(circle => {
        if (circle.timeout) clearTimeout(circle.timeout);
        if (circle.element.parentNode) circle.element.remove();
    });
    activeCircles = [];
    particleSystem.particles = [];
    
    updateScore();
    updateLivesDisplay();
    levelDisplay.textContent = level;
    updateCombo();
    maxComboDisplay.textContent = '0';
    progressFill.style.width = '0%';
    progressText.textContent = '0/10';
    
    challengeDesc.textContent = 'Catch moving circles!';
    challengeDesc.style.color = 'white';
    difficultyTag.textContent = 'NORMAL';
    difficultyTag.style.color = '#00f0ff';
    difficultyTag.style.borderColor = '#00f0ff';
    circleCountDisplay.textContent = '0';
    lifetimeDisplay.textContent = '3.5s';
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    
    if (!muted) {
        sounds.bgMusic.currentTime = 0;
        sounds.bgMusic.play().catch(e => console.log('Music play error:', e));
    }
    
    if (gameInterval) clearInterval(gameInterval);
    if (movementInterval) clearInterval(movementInterval);
    if (timerInterval) clearInterval(timerInterval);
    
    gameInterval = setInterval(createMovingCircle, 1600);
    movementInterval = setInterval(moveCircles, 20);
    startTimer();
    
    if (!animationFrameId) animate();
}

// End game
function endGame() {
    gameActive = false;
    
    clearInterval(gameInterval);
    clearInterval(movementInterval);
    clearInterval(timerInterval);
    
    activeCircles.forEach(circleData => {
        if (circleData.timeout) clearTimeout(circleData.timeout);
        if (circleData.element.parentNode) circleData.element.remove();
    });
    activeCircles = [];
    
    finalScore.textContent = score;
    finalLevel.textContent = level;
    finalCombo.textContent = maxCombo;
    finalTime.textContent = timerDisplay.textContent;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('movingCirclesBestScore', bestScore);
        bestScoreDisplay.textContent = bestScore;
    }
    
    sounds.bgMusic.pause();
    sounds.bgMusic.currentTime = 0;
    
    gameOverScreen.classList.remove('hidden');
}

// Toggle pause
function togglePause() {
    if (!gameActive) return;
    paused = !paused;
    pauseBtn.textContent = paused ? '▶️' : '⏸️';
    
    if (paused) {
        clearInterval(gameInterval);
        clearInterval(movementInterval);
        clearInterval(timerInterval);
        sounds.bgMusic.pause();
        pauseScreen.classList.remove('hidden');
    } else {
        const spawnRate = Math.max(1000, 1600 - (level * 40));
        gameInterval = setInterval(createMovingCircle, spawnRate);
        movementInterval = setInterval(moveCircles, 20);
        timerInterval = setInterval(() => { gameTime++; updateTimer(); }, 1000);
        if (!muted) sounds.bgMusic.play();
        pauseScreen.classList.add('hidden');
    }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
startBtnScreen.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
quickRestart.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);

// Mute
muteBtn.addEventListener('click', () => {
    muted = !muted;
    Object.values(sounds).forEach(sound => sound.muted = muted);
    muteBtn.textContent = muted ? '🔇' : '🔊';
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    clearInterval(gameInterval);
    clearInterval(movementInterval);
    clearInterval(timerInterval);
});

// Initialize
console.log('Moving Circles - Enhanced Danger Visibility!');