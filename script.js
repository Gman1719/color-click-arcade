// ============================================
// 🎯 MOVING CIRCLES • ARCADE EDITION • FIXED & ENHANCED
// ============================================

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

// ============================================
// 🎮 GAME VARIABLES
// ============================================
let score = 0;
let lives = 3;
let level = 1;
let combo = 0;
let maxCombo = 0;
let gameTime = 0;
let bestScore = parseInt(localStorage.getItem('movingCirclesBestScore')) || 0;
bestScoreDisplay.textContent = bestScore;

// Circle settings
let circleLifetime = 3500;
let baseSpeed = 1.2;
let activeCircles = [];

// Game state
let gameActive = false;
let paused = false;
let muted = false;
let isGameEnding = false; // Prevent multiple endGame calls

// Interval/Animation IDs
let gameInterval = null;
let timerInterval = null;
let animationFrameId = null;
let gameLoopId = null;

// ============================================
// 🔊 AUDIO SYSTEM - FIXED: Guaranteed sound playback
// ============================================
const sounds = {
    click: new Audio('assets/sounds/click.wav'),
    miss: new Audio('assets/sounds/miss.wav'),
    danger: new Audio('assets/sounds/danger.wav'),
    bgMusic: new Audio('assets/music/background.mp3')
};

// Configure audio
sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.3;
sounds.click.volume = 0.5;
sounds.miss.volume = 0.6;
sounds.danger.volume = 0.8;

// Preload all sounds
Object.values(sounds).forEach(sound => {
    sound.load();
    sound.addEventListener('error', (e) => console.log(`Audio preload: ${sound.src}`, e));
});

// ✅ FIXED: Reliable playSound function
function playSound(soundName) {
    if (muted) return;
    
    try {
        // Clone the preloaded audio for overlapping playback
        const sound = sounds[soundName];
        if (sound) {
            const soundClone = sound.cloneNode();
            soundClone.volume = sound.volume;
            
            // Play with promise catch
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Fallback to original sound
                    sound.currentTime = 0;
                    sound.play().catch(err => console.log(`Sound fallback error: ${soundName}`, err));
                });
            }
            
            // Clean up clone after playing
            soundClone.addEventListener('ended', () => {
                soundClone.remove();
            });
        }
    } catch (e) {
        console.log(`PlaySound error (${soundName}):`, e);
    }
}

// ============================================
// ✨ PARTICLE SYSTEM - Enhanced
// ============================================
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createExplosion(x, y, color, count = 10, sizeMultiplier = 1) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const velocity = (2 + Math.random() * 3) * sizeMultiplier;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                life: 0.8,
                size: (6 + Math.random() * 6) * sizeMultiplier,
                rotation: Math.random() * 360
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
            
            if (p.life <= 0 || p.y > gameContainer.clientHeight + 50) {
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

// ============================================
// ⏱️ TIMER FUNCTIONS
// ============================================
function startTimer() {
    gameTime = 0;
    updateTimer();
    
    if (timerInterval) clearInterval(timerInterval);
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

// ============================================
// ✅ FIXED: Circle overlap prevention
// ============================================
function isOverlapping(newX, newY, size = 70, buffer = 25) {
    return activeCircles.some(circle => {
        const el = circle.element;
        const left = parseFloat(el.style.left);
        const top = parseFloat(el.style.top);
        const distance = Math.hypot(left - newX, top - newY);
        return distance < size + buffer;
    });
}

// ============================================
// 🟢 CREATE MOVING CIRCLES - Enhanced & Fixed
// ============================================
function createMovingCircle() {
    if (!gameActive || paused) return;
    
    // Limit max circles for performance
    if (activeCircles.length > 30) return;
    
    const rand = Math.random();
    let type;
    if (rand < 0.12) {
        type = 'bonus';
    } else if (rand > 0.70) { // 30% chance for danger (more exciting)
        type = 'danger';
    } else {
        type = 'regular';
    }
    
    const circle = document.createElement('div');
    circle.className = `circle ${type}`;
    
    // ========== ENHANCED DANGER VISUALS ==========
    if (type === 'danger') {
        circle.style.animation = 'dangerPulse 0.5s infinite alternate';
        circle.style.boxShadow = '0 0 40px #ff0000, 0 0 80px #ff0000';
        
        const skull = document.createElement('span');
        skull.textContent = '💀';
        skull.style.position = 'absolute';
        skull.style.top = '50%';
        skull.style.left = '50%';
        skull.style.transform = 'translate(-50%, -50%)';
        skull.style.fontSize = '32px';
        skull.style.zIndex = '25';
        skull.style.filter = 'drop-shadow(0 0 5px black)';
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
    
    const size = 70;
    let startX, startY;
    let attempts = 0;
    let maxAttempts = 50;
    
    // ✅ FIXED: Prevent circle overlap at spawn
    do {
        const side = Math.floor(Math.random() * 4);
        
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
        
        attempts++;
        if (attempts >= maxAttempts) break;
    } while (isOverlapping(startX, startY, size) && attempts < maxAttempts);
    
    circle.style.left = startX + 'px';
    circle.style.top = startY + 'px';
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';
    
    // ✅ FIXED: Mobile touch optimization
    circle.style.touchAction = 'manipulation';
    circle.style.userSelect = 'none';
    circle.style.webkitTapHighlightColor = 'transparent';
    
    // Movement calculation
    let speed = baseSpeed;
    if (type === 'bonus') speed = baseSpeed * 1.3;
    if (type === 'danger') speed = baseSpeed * 1.8;
    speed += level * 0.15;
    
    const centerX = gameContainer.clientWidth / 2;
    const centerY = gameContainer.clientHeight / 2;
    const angleToCenter = Math.atan2(centerY - startY, centerX - startX);
    const randomAngle = angleToCenter + (Math.random() - 0.5) * 0.8;
    
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
        clickHandler: null,
        touchHandler: null
    };
    
    activeCircles.push(circleData);
    
    // Set timeout based on type
    let lifetime = circleLifetime;
    if (type === 'danger') lifetime = circleLifetime - 400; // Danger disappears faster
    if (type === 'bonus') lifetime = circleLifetime - 200; // Bonus disappears slightly faster
    
    circleData.timeout = setTimeout(() => {
        removeCircle(circleData, 'timeout');
    }, Math.max(1500, lifetime - (level * 60)));
    
    // ========== EVENT HANDLERS ==========
    circleData.clickHandler = (e) => {
        e.stopPropagation();
        handleCircleClick(circleData, e);
    };
    
    circleData.touchHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCircleClick(circleData, e);
    };
    
    circle.addEventListener('click', circleData.clickHandler);
    circle.addEventListener('touchstart', circleData.touchHandler, { passive: false });
    
    circleCountDisplay.textContent = activeCircles.length;
}

// ============================================
// 🎯 HANDLE CIRCLE CLICK - FIXED: Danger sound & scoring
// ============================================
function handleCircleClick(circleData, event) {
    if (!gameActive || paused) return;
    
    const circle = circleData.element;
    const type = circleData.type;
    
    // Visual click feedback
    circle.style.transform = 'scale(0.8)';
    circle.style.opacity = '0.8';
    setTimeout(() => {
        if (circle.parentNode) {
            circle.style.transform = '';
            circle.style.opacity = '';
        }
    }, 80);
    
    const rect = circle.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    
    // ========== DANGER CIRCLE ==========
    if (type === 'danger') {
        lives -= 1;
        combo = 0;
        
        // ✅ FIXED: Reliable danger sound
        playSound('danger');
        
        // Enhanced danger explosion
        particleSystem.createExplosion(x, y, '#ff0000', 24, 1.2);
        particleSystem.createExplosion(x, y, '#ff8800', 12, 0.8);
        
        challengeDesc.textContent = '💀 DANGER! -1 LIFE 💀';
        challengeDesc.style.color = '#ff3860';
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
    // ========== REGULAR CIRCLE ==========
    else if (type === 'regular') {
        // ✅ NEW: Combo multiplier system
        let multiplier = 1;
        if (combo >= 15) multiplier = 3;
        else if (combo >= 8) multiplier = 2;
        else if (combo >= 3) multiplier = 1.5;
        
        const points = Math.floor(1 * multiplier);
        score += points;
        combo += 1;
        
        playSound('click');
        particleSystem.createExplosion(x, y, '#ff7b7b', 8);
        challengeDesc.textContent = `🎯 +${points} (${multiplier}x)`;
    }
    // ========== BONUS CIRCLE ==========
    else if (type === 'bonus') {
        let multiplier = 1;
        if (combo >= 15) multiplier = 3;
        else if (combo >= 8) multiplier = 2;
        else if (combo >= 3) multiplier = 1.5;
        
        const points = Math.floor(5 * multiplier);
        score += points;
        combo += 2;
        
        playSound('click');
        particleSystem.createExplosion(x, y, '#ffd700', 16, 1.2);
        challengeDesc.textContent = `✨ BONUS! +${points} ✨`;
    }
    
    updateCombo();
    updateScore();
    
    removeCircle(circleData, 'click');
}

// ============================================
// 🔄 REMOVE CIRCLE - FIXED: Only danger penalizes on escape
// ============================================
function removeCircle(circleData, reason) {
    const index = activeCircles.indexOf(circleData);
    if (index === -1) return;
    
    const circle = circleData.element;
    const type = circleData.type;
    
    if (circleData.timeout) clearTimeout(circleData.timeout);
    if (circleData.clickHandler) {
        circle.removeEventListener('click', circleData.clickHandler);
    }
    if (circleData.touchHandler) {
        circle.removeEventListener('touchstart', circleData.touchHandler);
    }
    
    if (circle.parentNode) circle.remove();
    activeCircles.splice(index, 1);
    
    // ========== HANDLE MISSED CIRCLES ==========
    if (reason === 'timeout') {
        // ✅ FIXED: Only DANGER circles penalize when they escape
        if (type === 'danger') {
            playSound('miss');
            lives -= 1;
            combo = 0;
            updateCombo();
            updateLivesDisplay();
            
            challengeDesc.textContent = '💀 DANGER ESCAPED! -1 LIFE 💀';
            challengeDesc.style.color = '#ff3860';
            
            setTimeout(() => {
                challengeDesc.style.color = 'white';
            }, 500);
            
            if (lives <= 0) {
                endGame();
                return;
            }
        } else {
            // Regular and bonus circles just disappear - NO PENALTY!
            challengeDesc.textContent = '⏰ Missed...';
            
            // Brief message
            setTimeout(() => {
                if (challengeDesc.textContent === '⏰ Missed...') {
                    challengeDesc.textContent = 'Catch moving circles!';
                }
            }, 800);
        }
    }
    
    circleCountDisplay.textContent = activeCircles.length;
}

// ============================================
// 🏃 MOVE CIRCLES - Enhanced with danger trails
// ============================================
function moveCircles() {
    if (!gameActive || paused) return;
    
    activeCircles.forEach(circleData => {
        const circle = circleData.element;
        let left = parseFloat(circle.style.left);
        let top = parseFloat(circle.style.top);
        
        left += circleData.vx;
        top += circleData.vy;
        
        // Wrap around edges
        if (left <= -80) left = gameContainer.clientWidth;
        if (left >= gameContainer.clientWidth) left = -80;
        if (top <= -80) top = gameContainer.clientHeight;
        if (top >= gameContainer.clientHeight) top = -80;
        
        circle.style.left = left + 'px';
        circle.style.top = top + 'px';
        
        // ✅ NEW: Particle trail for danger circles
        if (circleData.type === 'danger' && Math.random() < 0.25) {
            const x = left + 35;
            const y = top + 35;
            particleSystem.createExplosion(x, y, '#8B0000', 2, 0.6);
        }
    });
}

// ============================================
// 📊 UPDATE DISPLAYS
// ============================================
function updateScore() {
    scoreDisplay.textContent = score;
    quickScore.textContent = score;
    
    // Level progress (every 10 points)
    const progress = score % 10;
    const progressPercent = (progress / 10) * 100;
    progressFill.style.width = progressPercent + '%';
    progressText.textContent = `${progress}/10`;
    
    // Level up check
    if (score > 0 && score % 10 === 0 && Math.floor(score / 10) >= level) {
        levelUp();
    }
}

function updateLivesDisplay() {
    livesDisplay.textContent = lives;
    quickLives.textContent = lives;
    
    // Visual feedback for life loss
    if (lives < 3) {
        const livesCard = document.querySelector('.lives-block');
        if (livesCard) {
            livesCard.style.animation = 'shake 0.3s';
            setTimeout(() => {
                livesCard.style.animation = '';
            }, 300);
        }
    }
}

function updateCombo() {
    comboCountDisplay.textContent = combo;
    quickCombo.textContent = combo;
    
    const comboPercentage = Math.min((combo / 20) * 100, 100);
    comboFill.style.width = comboPercentage + '%';
    
    // Visual feedback for high combo
    if (combo >= 10) {
        comboCountDisplay.style.color = '#ffd700';
        comboCountDisplay.style.textShadow = '0 0 10px #ffd700';
        comboFill.style.background = 'linear-gradient(90deg, #ffd700, #ffb347)';
    } else {
        comboCountDisplay.style.color = '#00f0ff';
        comboCountDisplay.style.textShadow = 'none';
        comboFill.style.background = 'linear-gradient(90deg, #00f0ff, #b721ff)';
    }
    
    maxCombo = Math.max(maxCombo, combo);
    maxComboDisplay.textContent = maxCombo;
}

function levelUp() {
    level++;
    levelDisplay.textContent = level;
    
    // Increase difficulty
    baseSpeed += 0.15;
    circleLifetime = Math.max(2000, circleLifetime - 180);
    
    challengeDesc.textContent = `⚡ LEVEL ${level}! ⚡`;
    challengeDesc.style.color = '#00f0ff';
    challengeDesc.style.fontWeight = '800';
    challengeDesc.style.animation = 'pulse 0.5s';
    
    setTimeout(() => {
        challengeDesc.style.color = 'white';
        challengeDesc.style.fontWeight = '500';
        challengeDesc.style.animation = '';
    }, 1000);
    
    // Update difficulty tag
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
    
    // Update spawn rate
    if (gameInterval) {
        clearInterval(gameInterval);
        const spawnRate = Math.max(900, 1600 - (level * 50));
        gameInterval = setInterval(createMovingCircle, spawnRate);
    }
}

// ============================================
// 🎬 ANIMATION LOOP - Optimized with RAF
// ============================================
function animate() {
    if (!animationFrameId) return;
    
    if (gameActive && !paused) {
        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particleSystem.update();
        particleSystem.draw(ctx);
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

// ✅ NEW: Game loop using RAF for smooth movement
function gameLoop() {
    if (gameActive && !paused) {
        moveCircles();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// ============================================
// 🚀 START GAME - FIXED: Clean initialization
// ============================================
function startGame() {
    // ✅ FIXED: Prevent multiple starts
    if (gameActive) return;
    
    // Clean up all existing intervals
    if (gameInterval) clearInterval(gameInterval);
    if (timerInterval) clearInterval(timerInterval);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    // Reset game state
    gameActive = true;
    paused = false;
    isGameEnding = false;
    
    // Reset stats
    score = 0;
    lives = 3;
    level = 1;
    combo = 0;
    maxCombo = 0;
    baseSpeed = 1.2;
    circleLifetime = 3500;
    
    // Clear all existing circles
    activeCircles.forEach(circle => {
        if (circle.timeout) clearTimeout(circle.timeout);
        if (circle.element.parentNode) circle.element.remove();
    });
    activeCircles = [];
    particleSystem.particles = [];
    
    // Update displays
    updateScore();
    updateLivesDisplay();
    levelDisplay.textContent = level;
    updateCombo();
    maxComboDisplay.textContent = '0';
    progressFill.style.width = '0%';
    progressText.textContent = '0/10';
    circleCountDisplay.textContent = '0';
    
    // Reset UI
    challengeDesc.textContent = 'Catch moving circles!';
    challengeDesc.style.color = 'white';
    difficultyTag.textContent = 'NORMAL';
    difficultyTag.style.color = '#00f0ff';
    difficultyTag.style.borderColor = '#00f0ff';
    lifetimeDisplay.textContent = '3.5s';
    
    // Hide screens
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    
    // Start background music
    if (!muted) {
        sounds.bgMusic.currentTime = 0;
        sounds.bgMusic.play().catch(e => console.log('Music play error:', e));
    }
    
    // Start game systems
    gameInterval = setInterval(createMovingCircle, 1600);
    startTimer();
    
    // Start animation loops
    animationFrameId = requestAnimationFrame(animate);
    gameLoopId = requestAnimationFrame(gameLoop);
}

// ============================================
// 🏁 END GAME - FIXED: Prevent double execution
// ============================================
function endGame() {
    // ✅ FIXED: Prevent multiple calls
    if (isGameEnding || !gameActive) return;
    isGameEnding = true;
    gameActive = false;
    
    // Stop all intervals and animations
    if (gameInterval) clearInterval(gameInterval);
    if (timerInterval) clearInterval(timerInterval);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    // Clean up circles
    activeCircles.forEach(circleData => {
        if (circleData.timeout) clearTimeout(circleData.timeout);
        if (circleData.element.parentNode) circleData.element.remove();
    });
    activeCircles = [];
    
    // Update final stats
    finalScore.textContent = score;
    finalLevel.textContent = level;
    finalCombo.textContent = maxCombo;
    finalTime.textContent = timerDisplay.textContent;
    
    // ✅ FIXED: Best score handling
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('movingCirclesBestScore', String(score));
        bestScoreDisplay.textContent = score;
    }
    
    // Stop music
    sounds.bgMusic.pause();
    sounds.bgMusic.currentTime = 0;
    
    // Show game over screen
    gameOverScreen.classList.remove('hidden');
    
    // Reset flag after delay
    setTimeout(() => {
        isGameEnding = false;
    }, 500);
}

// ============================================
// ⏸️ PAUSE/TOGGLE FUNCTIONS
// ============================================
function togglePause() {
    if (!gameActive) return;
    
    paused = !paused;
    pauseBtn.textContent = paused ? '▶️' : '⏸️';
    
    if (paused) {
        // Pause game
        if (gameInterval) clearInterval(gameInterval);
        if (timerInterval) clearInterval(timerInterval);
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        sounds.bgMusic.pause();
        pauseScreen.classList.remove('hidden');
    } else {
        // Resume game
        const spawnRate = Math.max(900, 1600 - (level * 50));
        gameInterval = setInterval(createMovingCircle, spawnRate);
        timerInterval = setInterval(() => { 
            if (!paused) gameTime++; 
            updateTimer(); 
        }, 1000);
        if (!muted) sounds.bgMusic.play();
        gameLoopId = requestAnimationFrame(gameLoop);
        pauseScreen.classList.add('hidden');
    }
}

// ============================================
// 🔇 MUTE TOGGLE
// ============================================
function toggleMute() {
    muted = !muted;
    Object.values(sounds).forEach(sound => sound.muted = muted);
    muteBtn.textContent = muted ? '🔇' : '🔊';
}

// ============================================
// 🎯 EVENT LISTENERS
// ============================================
startBtn.addEventListener('click', startGame);
startBtnScreen.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
quickRestart.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
muteBtn.addEventListener('click', toggleMute);

// ============================================
// ✨ ADD CSS ANIMATIONS DYNAMICALLY
// ============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes dangerPulse {
        0% { box-shadow: 0 0 30px #ff0000, 0 0 60px #ff0000; }
        100% { box-shadow: 0 0 50px #ff0000, 0 0 100px #ff0000; }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .circle {
        transition: transform 0.08s, opacity 0.08s;
    }
`;
document.head.appendChild(style);

// ============================================
// 🧹 CLEANUP ON PAGE UNLOAD
// ============================================
window.addEventListener('beforeunload', () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (gameInterval) clearInterval(gameInterval);
    if (timerInterval) clearInterval(timerInterval);
});

// ============================================
// ✅ INITIALIZATION
// ============================================
console.log('🎯 Moving Circles • ARCADE EDITION • Fully Fixed & Enhanced');
console.log('✅ Danger sound - FIXED');
console.log('✅ Circle overlap - FIXED');
console.log('✅ Life penalty system - FIXED');
console.log('✅ Multiple start bug - FIXED');
console.log('✅ Combo multiplier - ADDED');
console.log('✅ Mobile touch - OPTIMIZED');