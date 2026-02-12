// DOM Elements
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const finalScore = document.getElementById('final-score');
const finalLevel = document.getElementById('final-level');
const finalCombo = document.getElementById('final-combo');
const restartBtn = document.getElementById('restart-btn');
const muteBtn = document.getElementById('mute-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const comboCounter = document.getElementById('combo-counter');
const comboCount = document.getElementById('combo-count');
const timerDisplay = document.getElementById('timer');

// Canvas for advanced particles
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

// Game variables
let score = 0;
let lives = 3;
let level = 1;
let speed = 1500;
let gameInterval;
let muted = false;
let paused = false;
let combo = 0;
let maxCombo = 0;
let gameTime = 0;
let timerInterval;
let animationFrameId;
let circles = [];

// Audio setup - FIXED: Using correct file paths and formats
const sounds = {
    click: new Audio('assets/sounds/click.wav'),
    miss: new Audio('assets/sounds/miss.mp3'), // Using miss.wav instead of miss.mp3
    danger: new Audio('assets/sounds/danger.wav'),
    bgMusic: new Audio('assets/music/background.mp3')
};

// Configure audio
sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.3;
sounds.click.volume = 0.4;
sounds.miss.volume = 0.5;
sounds.danger.volume = 0.5;

// FIXED: Preload audio with proper error handling
function preloadAudio() {
    Object.values(sounds).forEach(sound => {
        sound.load();
        sound.addEventListener('error', (e) => {
            console.log(`Audio load error for ${sound.src}:`, e);
        });
    });
}

// Call preload immediately
preloadAudio();

// Particle system
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                life: 1,
                size: 4 + Math.random() * 4
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= 0.02;
            p.size *= 0.98;
            
            if (p.life <= 0 || p.y > gameContainer.clientHeight) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
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
        if (!paused) {
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

// FIXED: Mute/unmute button - properly handle audio muting
muteBtn.addEventListener('click', () => {
    muted = !muted;
    Object.values(sounds).forEach(sound => {
        sound.muted = muted;
    });
    muteBtn.textContent = muted ? '🔇' : '🔊';
});

// Pause/Resume
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);

function togglePause() {
    if (!gameInterval) return;
    
    paused = !paused;
    pauseBtn.textContent = paused ? '▶️' : '⏸️';
    
    if (paused) {
        clearInterval(gameInterval);
        pauseScreen.classList.remove('hidden');
        sounds.bgMusic.pause();
    } else {
        gameInterval = setInterval(createCircle, speed);
        pauseScreen.classList.add('hidden');
        // FIXED: Only play if not muted
        if (!muted) {
            sounds.bgMusic.play().catch(err => console.log('Music resume error:', err));
        }
    }
}

// FIXED: Start Game button - properly initialize audio
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    
    // FIXED: Reset and play background music
    if (!muted) {
        sounds.bgMusic.currentTime = 0;
        sounds.bgMusic.play().catch(err => {
            console.log('Music playback error:', err);
            // FIXED: Try playing on user interaction
            document.addEventListener('click', function playOnClick() {
                sounds.bgMusic.play().catch(e => console.log('Still blocked:', e));
                document.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    }
    
    startGame();
});

// FIXED: Restart button
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    
    // FIXED: Reset and play background music
    if (!muted) {
        sounds.bgMusic.currentTime = 0;
        sounds.bgMusic.play().catch(err => {
            console.log('Music restart error:', err);
        });
    }
    
    startGame();
});

// FIXED: Play miss sound function with fallback
function playMissSound() {
    if (muted) return;
    
    // Try to play miss.wav
    sounds.miss.play().catch(err => {
        console.log('Miss sound error, trying fallback:', err);
        // FIXED: Fallback to click sound if miss sound fails
        sounds.click.play().catch(e => console.log('Fallback sound also failed:', e));
    });
}

// Random color generator
function getRandomColor(type = 'regular') {
    if (type === 'bonus') return '#FFD700';
    if (type === 'danger') return '#FF0000';
    const colors = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502', '#ff6b81', '#a55eea', '#20bf6b'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Create a circle
function createCircle() {
    if (paused) return;
    
    let rand = Math.random();
    let type = 'regular';
    if (rand < 0.1) type = 'bonus';
    else if (rand > 0.85) type = 'danger';

    const circle = document.createElement('div');
    circle.classList.add('circle');
    circle.style.backgroundColor = getRandomColor(type);
    circle.style.top = Math.random() * (gameContainer.clientHeight - 60) + 'px';
    circle.style.left = Math.random() * (gameContainer.clientWidth - 60) + 'px';
    circle.dataset.type = type;
    circle.dataset.created = Date.now();
    
    gameContainer.appendChild(circle);
    circles.push(circle);

    // Timeout to remove circle if not clicked
    const timeout = setTimeout(() => {
        if (gameContainer.contains(circle)) {
            circle.remove();
            circles = circles.filter(c => c !== circle);
            
            if (type !== 'bonus') {
                // FIXED: Play miss sound when circle expires
                playMissSound();
                
                lives--;
                livesDisplay.textContent = lives;
                combo = 0;
                comboCounter.classList.add('hidden');
                
                if (lives === 0) endGame();
            }
        }
    }, 1500);

    // Circle click handler
    circle.addEventListener('click', () => {
        const type = circle.dataset.type;
        const rect = circle.getBoundingClientRect();
        const containerRect = gameContainer.getBoundingClientRect();
        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top + rect.height / 2;
        
        if (type === 'regular') {
            score++;
            combo++;
            if (!muted) sounds.click.play().catch(e => console.log('Click sound error:', e));
            particleSystem.createExplosion(x, y, circle.style.backgroundColor, 8);
        } else if (type === 'bonus') {
            score += 5;
            combo += 2;
            if (!muted) sounds.click.play().catch(e => console.log('Click sound error:', e));
            particleSystem.createExplosion(x, y, '#FFD700', 16);
        } else if (type === 'danger') {
            lives--;
            combo = 0;
            if (!muted) sounds.danger.play().catch(e => console.log('Danger sound error:', e));
            livesDisplay.textContent = lives;
            particleSystem.createExplosion(x, y, '#FF0000', 20);
            
            if (lives === 0) endGame();
        }

        // Update combo
        if (combo > 0) {
            maxCombo = Math.max(maxCombo, combo);
            comboCount.textContent = combo;
            comboCounter.classList.remove('hidden');
        } else {
            comboCounter.classList.add('hidden');
        }

        scoreDisplay.textContent = score;
        circle.remove();
        circles = circles.filter(c => c !== circle);
        clearTimeout(timeout);

        // Level up every 10 points
        if (score > 0 && score % 10 === 0) {
            level++;
            levelDisplay.textContent = level;
            if (speed > 500) {
                speed = Math.max(500, speed - 100);
                clearInterval(gameInterval);
                gameInterval = setInterval(createCircle, speed);
            }
        }
    });
}

// Animation loop
function animate() {
    if (!paused) {
        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particleSystem.update();
        particleSystem.draw(ctx);
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

// Start the game
function startGame() {
    // Reset game state
    score = 0;
    lives = 3;
    level = 1;
    speed = 1500;
    combo = 0;
    maxCombo = 0;
    
    // Clear existing elements
    circles.forEach(circle => circle.remove());
    circles = [];
    particleSystem.particles = [];
    
    // Update displays
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    levelDisplay.textContent = level;
    comboCounter.classList.add('hidden');
    
    // Hide screens
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    paused = false;
    pauseBtn.textContent = '⏸️';
    
    // Clear existing intervals
    if (gameInterval) clearInterval(gameInterval);
    if (timerInterval) clearInterval(timerInterval);
    
    // Start game loops
    gameInterval = setInterval(createCircle, speed);
    startTimer();
    
    // Start animation if not already running
    if (!animationFrameId) {
        animate();
    }
}

// End the game
function endGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    gameInterval = null;
    timerInterval = null;
    
    // Clean up circles
    circles.forEach(circle => circle.remove());
    circles = [];
    
    // Update final stats
    finalScore.textContent = score;
    finalLevel.textContent = level;
    finalCombo.textContent = maxCombo;
    
    // Show game over screen
    gameOverScreen.classList.remove('hidden');
    
    // FIXED: Stop music
    sounds.bgMusic.pause();
    sounds.bgMusic.currentTime = 0;
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    clearInterval(gameInterval);
    clearInterval(timerInterval);
});

// FIXED: Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameInterval) {
        sounds.bgMusic.pause();
    }
});

// Resize handler
window.addEventListener('resize', () => {
    circles.forEach(circle => {
        const left = parseFloat(circle.style.left);
        const top = parseFloat(circle.style.top);
        
        if (left > gameContainer.clientWidth - 60) {
            circle.style.left = gameContainer.clientWidth - 60 + 'px';
        }
        if (top > gameContainer.clientHeight - 60) {
            circle.style.top = gameContainer.clientHeight - 60 + 'px';
        }
    });
});

// FIXED: Test audio on page load
window.addEventListener('load', () => {
    console.log('Page loaded, testing audio files...');
    
    // Test miss sound specifically
    const testMiss = new Audio('assets/sounds/miss.wav');
    testMiss.addEventListener('canplaythrough', () => {
        console.log('✅ miss.wav loaded successfully');
    });
    testMiss.addEventListener('error', (e) => {
        console.error('❌ miss.wav failed to load:', e);
        console.log('Please check if assets/sounds/miss.wav exists in your folder structure');
    });
    testMiss.load();
    
    // Test background music
    const testBg = new Audio('assets/music/background.mp3');
    testBg.addEventListener('canplaythrough', () => {
        console.log('✅ background.mp3 loaded successfully');
    });
    testBg.addEventListener('error', (e) => {
        console.error('❌ background.mp3 failed to load:', e);
        console.log('Please check if assets/music/background.mp3 exists in your folder structure');
    });
    testBg.load();
});

// Initialize
console.log('Color Click Arcade initialized!');