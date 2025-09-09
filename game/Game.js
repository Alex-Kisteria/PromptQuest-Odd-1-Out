
        // Game variables
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        // Audio system
        let audioContext;
        let backgroundMusic;
        let jumpSound;
        let shootSound;
        let audioInitialized = false;
        
        // Initialize audio
        function initAudio() {
            if (audioInitialized) return;
            
            try {
                // Create audio objects
                backgroundMusic = new Audio('assets/Audio/BackgroundMusic.mp3');
                jumpSound = new Audio('assets/Audio/jump.MP3');
                shootSound = new Audio('assets/Audio/Pop.mp3');
                
                // Configure background music
                backgroundMusic.loop = true;
                backgroundMusic.volume = 0.3;
                
                // Configure sound effects
                jumpSound.volume = 0.5;
                shootSound.volume = 0.4;
                
                audioInitialized = true;
            } catch (error) {
                console.error('Failed to initialize audio:', error);
            }
        }
        
        function playBackgroundMusic() {
            if (backgroundMusic && audioInitialized) {
                backgroundMusic.play().catch(e => console.log('Background music play failed:', e));
            }
        }
        
        function stopBackgroundMusic() {
            if (backgroundMusic && audioInitialized) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
        }
        
        function playJumpSound() {
            if (jumpSound && audioInitialized) {
                jumpSound.currentTime = 0;
                jumpSound.play().catch(e => console.log('Jump sound play failed:', e));
            }
        }
        
        function playShootSound() {
            if (shootSound && audioInitialized) {
                shootSound.currentTime = 0;
                shootSound.play().catch(e => console.log('Shoot sound play failed:', e));
            }
        }
        
        // Sprite system
        let spriteSheet = null;
        let spritesLoaded = false;
        
        // Load sprite sheet
        const loadSprites = () => {
            spriteSheet = new Image();
            spriteSheet.src = "assets/sprites/player/tilemap-characters_packed.png";
            
            spriteSheet.onload = () => {
                spritesLoaded = true;
                console.log('Sprite sheet loaded successfully from:', spriteSheet.src);
                console.log('Sprite dimensions:', spriteSheet.width, 'x', spriteSheet.height);
            };
            
            spriteSheet.onerror = () => {
                console.error('Failed to load sprite sheet from:', spriteSheet.src);
                spritesLoaded = false;
            };
        };
        
        // Initialize sprite loading
        loadSprites();
        const gameStatus = document.getElementById('game-status');
        const statusTitle = document.getElementById('status-title');
        const statusMessage = document.getElementById('status-message');
        const startButton = document.getElementById('start-button');
        const resetButton = document.getElementById('reset-button');
        // Constants for your sheet
        const TILE_W = 18;
        const TILE_H = 18;
        // Player health bars are now drawn above characters
        // const fireboyHealth = document.querySelector('#fireboy-health .health-fill');
        // const watergirlHealth = document.querySelector('#watergirl-health .health-fill');
        const bossHealth = document.getElementById('boss-health');
        const bossHealthFill = document.getElementById('boss-health-fill');
        
        // Set canvas size
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        
        // Game state
        let gameState = 'start'; // start, playing, paused, gameover
        let players = [];
        let platforms = [];
        let traps = [];
        let weapons = [];
        let abilities = [];
        let bullets = [];
        let boss = null;
        let level = 1;
        let victoryDoor = null;
        let confetti = [];
        let champion = null;
        
        // Game world settings
        const WORLD_WIDTH = 960;
        
        // Camera system with zoom and horizontal panning
        let camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            zoom: 1,
            targetZoom: 1,
            smoothing: 0.05,
            zoomSmoothing: 0.02
        };
        
        // Checkpoint system
        let checkpoints = [];
        let currentCheckpoint = { level: 0, y: 400, platforms: [] };
        
        // Player class
        class Player {
            constructor(x, y, width, height, color, type, controls) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.color = color;
                this.type = type; // 'fire' or 'water'
                this.velocity = { x: 0, y: 0 };
                this.speed = 5;
                this.jumpStrength = 15;
                this.health = 100;
                this.maxHealth = 100;
                this.weapon = 'pistol';
                this.controls = controls;
                this.isShooting = false;
                this.shootCooldown = 0;
                this.facing = 'right';
                this.isOnGround = false;
                
                // Enhanced features from new code
                this.isInvulnerable = false;
                this.invulnerabilityTime = 0;
                this.lastShot = 0;
                this.shotCooldown = 500;
                this.specialAbility = null;
                this.abilityDuration = 0;
                
                // Sprite properties - Based on actual sprite sheet (216x72 = 9 cols × 3 rows with 24x24 sprites)
                this.spriteRow = 0; 
                this.spriteStartCol = type === 'fire' ? 0 : 2; // Fire at col 0, Water at col 2
                this.frameIndex = 0;
                this.animationSpeed = 15;
                this.frameCounter = 0;
                this.spriteWidth = 24;   // 24x24 sprite size
                this.spriteHeight = 24;  // 24x24 sprite size
                this.maxFrames = 2;      // fire & water each have 2 frames

            }
            
            draw() {
                ctx.save();
                
                // Add invulnerability flashing effect
                if (this.isInvulnerable) {
                    ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
                }
                
                // Draw player sprite if loaded, otherwise fallback to rectangle
                if (spritesLoaded && spriteSheet) {
                    this.drawSprite();
                } else {
                    // Fallback to rectangle drawing
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                    
                    // Draw border for better pixel art look
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                }
                
                // Draw weapon - adjusted for camera and zoom
                this.drawWeapon();
                
                // Draw health bar above player
                this.drawHealthBar();
                
                ctx.restore();
            }

            
            
            drawSprite() {
            // --- Animation update ---
            if (Math.abs(this.velocity.x) > 0.1) {
                this.frameCounter++;
                if (this.frameCounter >= this.animationSpeed) {
                    this.frameCounter = 0;
                    this.frameIndex = (this.frameIndex + 1) % this.maxFrames;
                }
            } else {
                this.frameIndex = 0; // idle frame
            }

            // --- Source rect in sprite sheet ---
            const sourceX = (this.spriteStartCol + this.frameIndex) * this.spriteWidth;
            const sourceY = this.spriteRow * this.spriteHeight;

            // --- Destination (camera-aware) ---
            const destX = this.x;
            const destY = this.y - camera.y / camera.zoom;

            ctx.save();
            ctx.imageSmoothingEnabled = false; // crisp pixel art

            if (this.facing === 'left') {
                // Flip horizontally around the sprite center
                ctx.translate(destX + this.width / 2, destY + this.height / 2);
                ctx.scale(-1, 1);

                ctx.drawImage(
                    spriteSheet,
                    sourceX, sourceY,
                    this.spriteWidth, this.spriteHeight,
                    -this.width / 2, -this.height / 2, // draw centered after translate
                    this.width, this.height
                );
            } else {
                // Normal draw
                ctx.drawImage(
                    spriteSheet,
                    sourceX, sourceY,
                    this.spriteWidth, this.spriteHeight,
                    destX, destY,
                    this.width, this.height
                );
            }

            ctx.restore();
        }


            
            drawWeapon() {
                ctx.fillStyle = '#777';
                if (this.weapon === 'pistol') {
                    if (this.facing === 'right') {
                        ctx.fillRect(this.x + this.width, this.y - camera.y / camera.zoom + this.height/2 - 2, 10, 4);
                    } else {
                        ctx.fillRect(this.x - 10, this.y - camera.y / camera.zoom + this.height/2 - 2, 10, 4);
                    }
                } else if (this.weapon === 'shotgun') {
                    if (this.facing === 'right') {
                        ctx.fillRect(this.x + this.width, this.y - camera.y / camera.zoom + this.height/2 - 3, 15, 6);
                    } else {
                        ctx.fillRect(this.x - 15, this.y - camera.y / camera.zoom + this.height/2 - 3, 15, 6);
                    }
                }
            }
            
            drawHealthBar() {
                const barWidth = 40;
                const barHeight = 6;
                const barX = this.x + (this.width - barWidth) / 2;
                const barY = this.y - camera.y / camera.zoom - 15;
                
                // Health bar background
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Health bar border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
                
                // Health bar fill
                const healthPercent = this.health / this.maxHealth;
                const fillWidth = barWidth * healthPercent;
                
                // Color based on health level
                if (healthPercent > 0.6) {
                    ctx.fillStyle = '#4CAF50'; // Green
                } else if (healthPercent > 0.3) {
                    ctx.fillStyle = '#FF9800'; // Orange  
                } else {
                    ctx.fillStyle = '#F44336'; // Red
                }
                
                ctx.fillRect(barX, barY, fillWidth, barHeight);
                
                // Player name/type indicator
                ctx.fillStyle = '#fff';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                const playerName = this.type === 'fire' ? 'FIRE' : 'WATER';
                ctx.fillText(playerName, this.x + this.width / 2, barY - 3);
            }
            
            update() {
                this.handleInput();
                this.updatePhysics();
                this.updateAbilities();
                this.updateInvulnerability();
                
                // Shooting cooldown (legacy)
                if (this.shootCooldown > 0) {
                    this.shootCooldown--;
                }
                
                // Shoot if needed
                if (this.isShooting && this.shootCooldown === 0) {
                    this.shoot();
                    this.shootCooldown = this.weapon === 'pistol' ? 20 : 40;
                }
            }
            
            handleInput() {
                // Apply smooth movement with friction
                this.velocity.x *= 0.8;
                
                // Handle continuous movement from keys object
                if (keys[this.controls.left]) {
                    this.velocity.x = -this.speed;
                    this.facing = 'left';
                }
                if (keys[this.controls.right]) {
                    this.velocity.x = this.speed;
                    this.facing = 'right';
                }
                
                // Handle jump (check for key press and ground state)
                if (keys[this.controls.up] && this.isOnGround) {
                    this.velocity.y = -this.jumpStrength;
                    this.isOnGround = false;
                    playJumpSound();
                }
            }
            
            updatePhysics() {
                // Apply gravity
                this.velocity.y += 0.8;
                
                // Move player
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                
                // Ground collision (canvas floor) - only applies at the actual ground level
                if (this.y + this.height >= 570) { // Ground is at y=550, plus some buffer
                    this.y = 570 - this.height;
                    this.velocity.y = 0;
                    this.isOnGround = true;
                } else {
                    // Reset ground state (will be set to true by platform collision if applicable)
                    this.isOnGround = false;
                }
                
                // Platform collision handled in main game loop
                
                // Boundary check - limit to 960px width
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > WORLD_WIDTH) this.x = WORLD_WIDTH - this.width;
                
                // Respawn if falling way off screen (much lower than ground)
                if (this.y > 700) {
                    this.respawn();
                }
            }
            
            updateAbilities() {
                if (this.specialAbility && this.abilityDuration > 0) {
                    this.abilityDuration -= 16;
                    
                    if (this.abilityDuration <= 0) {
                        this.specialAbility = null;
                    }
                }
            }
            
            updateInvulnerability() {
                if (this.isInvulnerable) {
                    this.invulnerabilityTime -= 16;
                    if (this.invulnerabilityTime <= 0) {
                        this.isInvulnerable = false;
                    }
                }
            }
            
            jump() {
                if (this.isOnGround) {
                    this.velocity.y = -this.jumpStrength;
                    this.isOnGround = false;
                    playJumpSound();
                }
            }
            
            shoot() {
                const direction = this.facing === 'right' ? 1 : -1;
                const bulletX = this.facing === 'right' ? this.x + this.width : this.x;
                const bulletY = this.y + this.height/2;
                
                let bulletCount = 1;
                let spread = 0;
                
                if (this.weapon === 'shotgun') {
                    bulletCount = 5;
                    spread = 0.2;
                }
                
                for (let i = 0; i < bulletCount; i++) {
                    bullets.push(new Bullet(
                        bulletX,
                        bulletY,
                        5,
                        this.type,
                        direction,
                        this.weapon,
                        spread
                    ));
                }
                
                playShootSound();
            }
            
            takeDamage(amount) {
                if (this.isInvulnerable) return false;
                
                this.health -= amount;
                if (this.health < 0) this.health = 0;
                
                // Add invulnerability frames
                this.isInvulnerable = true;
                this.invulnerabilityTime = 1000; // 1 second of invulnerability
                
                // Health bar is now drawn above player, no DOM updates needed
                
                // Respawn if dead
                if (this.health <= 0) {
                    this.respawn();
                    return true;
                }
                
                return false;
            }
            
            applyKnockback(vx, vy) {
                this.velocity.x += vx * 0.5;
                this.velocity.y += vy * 0.5;
            }
            
            respawn() {
                this.health = this.maxHealth;
                
                // Find the best respawn position based on checkpoint system
                const respawnInfo = findBestRespawnPosition(this);
                this.x = respawnInfo.x;
                this.y = respawnInfo.y;
                
                this.velocity.x = 0;
                this.velocity.y = 0;
                
                // Health bar is now drawn above player, no DOM updates needed
            }
        }
        
        // Bullet class
        class Bullet {
            constructor(x, y, radius, type, direction, weaponType, spread) {
                this.x = x;
                this.y = y;
                this.width = radius * 2;
                this.height = radius * 2;
                this.radius = radius;
                this.type = type; // 'fire' or 'water'
                this.color = type === 'fire' ? '#ff5e00' : '#00b4db';
                this.velocity = { 
                    x: direction * (weaponType === 'pistol' ? 10 : 8),
                    y: (Math.random() - 0.5) * spread * 10
                };
                this.vx = this.velocity.x;
                this.vy = this.velocity.y;
                this.damage = weaponType === 'pistol' ? 10 : 5;
                this.owner = type;
                this.weapon = weaponType;
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - this.radius, this.y - camera.y / camera.zoom - this.radius, this.width, this.height);
                
                // Add border for pixelated look
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(this.x - this.radius, this.y - camera.y / camera.zoom - this.radius, this.width, this.height);
            }
            
            update() {
                this.x += this.velocity.x;
                this.y += this.velocity.y;
            }
        }
        
        // Platform class
        class Platform {
            constructor(x, y, width, height, color = '#0f3460') {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.color = color;
                this.checkpointLevel = this.calculateCheckpointLevel(y);
            }
            
            calculateCheckpointLevel(y) {
                // Define checkpoint levels based on Y coordinates
                if (y >= 500) return 0;      // Ground level
                else if (y >= 350) return 1; // Level 1
                else if (y >= 150) return 2; // Level 2  
                else if (y >= -50) return 3; // Level 3
                else if (y >= -200) return 4; // Level 4
                else if (y >= -350) return 5; // Level 5
                else if (y >= -500) return 6; // Level 6
                else if (y >= -650) return 7; // Level 7
                else if (y >= -800) return 8; // Level 8
                else return 9;               // Level 9+ (top)
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Add platform details
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
            }
        }
        
        // Trap class
        class Trap {
            constructor(x, y, width, height, type, damage) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.type = type; // 'spike', 'lava', 'water'
                this.damage = damage;
                
                if (type === 'spike') {
                    this.color = '#555';
                } else if (type === 'lava') {
                    this.color = '#ff5e00';
                } else if (type === 'water') {
                    this.color = '#00b4db';
                }
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Add trap details
                if (this.type === 'spike') {
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y - camera.y / camera.zoom + this.height);
                    for (let i = 0; i < this.width; i += 5) {
                        ctx.lineTo(this.x + i, this.y - camera.y / camera.zoom);
                        ctx.lineTo(this.x + i + 2.5, this.y - camera.y / camera.zoom + this.height);
                    }
                    ctx.lineTo(this.x + this.width, this.y - camera.y / camera.zoom);
                    ctx.lineTo(this.x + this.width, this.y - camera.y / camera.zoom + this.height);
                    ctx.closePath();
                    ctx.fillStyle = '#333';
                    ctx.fill();
                } else if (this.type === 'lava' || this.type === 'water') {
                    // Animated effect for liquids
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    for (let i = 0; i < this.width; i += 15) {
                        const waveHeight = Math.sin(Date.now() / 500 + i) * 3;
                        ctx.fillRect(this.x + i, this.y - camera.y / camera.zoom, 10, waveHeight);
                    }
                }
            }
        }
        
        // Weapon class
        class Weapon {
            constructor(x, y, type) {
                this.x = x;
                this.y = y;
                this.width = 20;
                this.height = 10;
                this.type = type; // 'pistol', 'shotgun'
                
                if (type === 'pistol') {
                    this.color = '#777';
                } else if (type === 'shotgun') {
                    this.color = '#555';
                }
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Add weapon details
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x + 5, this.y - camera.y / camera.zoom - 5, 10, 5);
            }
        }
        
        // Ability class
        class Ability {
            constructor(x, y, type) {
                this.x = x;
                this.y = y;
                this.radius = 10;
                this.type = type; // 'speed', 'rapid', 'shield'
                
                if (type === 'speed') {
                    this.color = '#ffff00';
                } else if (type === 'rapid') {
                    this.color = '#00ff00';
                } else if (type === 'shield') {
                    this.color = '#00ffff';
                }
            }
            
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y - camera.y / camera.zoom, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.closePath();
                
                // Pulsating effect
                const pulse = Math.sin(Date.now() / 200) * 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y - camera.y / camera.zoom, this.radius + pulse, 0, Math.PI * 2);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
            }
        }
        
        // Victory Door class
        class VictoryDoor {
            constructor(x, y, width, height) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.color = '#FFD700';
                this.glowIntensity = 0;
            }
            
            draw() {
                // Door glow effect
                this.glowIntensity = Math.sin(Date.now() / 300) * 0.3 + 0.7;
                
                // Draw door background
                ctx.fillStyle = `rgba(255, 215, 0, ${this.glowIntensity})`;
                ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Draw door border
                ctx.strokeStyle = '#B8860B';
                ctx.lineWidth = 3;
                ctx.strokeRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Draw door details (handle, panels)
                ctx.fillStyle = '#B8860B';
                // Door panels
                ctx.fillRect(this.x + 5, this.y - camera.y / camera.zoom + 5, this.width - 10, this.height - 10);
                // Door handle
                ctx.fillRect(this.x + this.width - 15, this.y - camera.y / camera.zoom + this.height/2 - 5, 8, 10);
                
                // Draw "VICTORY" text above door
                ctx.fillStyle = '#FFD700';
                ctx.font = '16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('VICTORY', this.x + this.width/2, this.y - camera.y / camera.zoom - 10);
            }
        }
        
        // Confetti particle class
        class ConfettiParticle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = Math.random() * -5 - 5;
                this.gravity = 0.3;
                this.color = this.getRandomColor();
                this.size = Math.random() * 6 + 4;
                this.life = 150;
                this.maxLife = 150;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            }
            
            getRandomColor() {
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
                return colors[Math.floor(Math.random() * colors.length)];
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += this.gravity;
                this.rotation += this.rotationSpeed;
                this.life--;
            }
            
            draw() {
                if (this.life <= 0) return;
                
                ctx.save();
                const alpha = this.life / this.maxLife;
                ctx.globalAlpha = alpha;
                ctx.translate(this.x, this.y - camera.y / camera.zoom);
                ctx.rotate(this.rotation);
                
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                
                ctx.restore();
            }
        }
        
        // Boss class
        class Boss {
            constructor() {
                this.x = canvas.width / 2 - 40;
                this.y = 100;
                this.width = 80;
                this.height = 80;
                this.health = 100;
                this.color = '#9c27b0';
                this.attackCooldown = 0;
            }
            
            draw() {
                // Draw boss body - adjusted for camera and zoom
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Draw boss face - adjusted for camera and zoom
                ctx.fillStyle = '#000';
                ctx.fillRect(this.x + 20, this.y - camera.y / camera.zoom + 20, 10, 10); // left eye
                ctx.fillRect(this.x + 50, this.y - camera.y / camera.zoom + 20, 10, 10); // right eye
                ctx.fillRect(this.x + 30, this.y - camera.y / camera.zoom + 50, 20, 5); // mouth
                
                // Draw angry eyebrows - adjusted for camera and zoom
                ctx.beginPath();
                ctx.moveTo(this.x + 15, this.y - camera.y / camera.zoom + 15);
                ctx.lineTo(this.x + 30, this.y - camera.y / camera.zoom + 10);
                ctx.moveTo(this.x + 65, this.y - camera.y / camera.zoom + 15);
                ctx.lineTo(this.x + 50, this.y - camera.y / camera.zoom + 10);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            update() {
                // Simple movement pattern
                this.x += Math.sin(Date.now() / 1000) * 2;
                
                // Attack logic
                if (this.attackCooldown <= 0) {
                    this.attack();
                    this.attackCooldown = 100;
                } else {
                    this.attackCooldown--;
                }
            }
            
            attack() {
                // Create projectiles aimed at players
                players.forEach(player => {
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const directionX = dx / distance;
                    const directionY = dy / distance;
                    
                    bullets.push({
                        x: this.x + this.width/2,
                        y: this.y + this.height/2,
                        radius: 8,
                        color: '#9c27b0',
                        velocity: { x: directionX * 5, y: directionY * 5 },
                        damage: 15,
                        update: function() {
                            this.x += this.velocity.x;
                            this.y += this.velocity.y;
                        },
                        draw: function() {
                            ctx.beginPath();
                            ctx.arc(this.x, this.y - camera.y / camera.zoom, this.radius, 0, Math.PI * 2);
                            ctx.fillStyle = this.color;
                            ctx.fill();
                            ctx.closePath();
                        }
                    });
                });
            }
            
            takeDamage(amount) {
                this.health -= amount;
                if (this.health < 0) this.health = 0;
                
                // Update boss health bar
                bossHealthFill.style.width = this.health + '%';
                
                return this.health <= 0;
            }
        }
        
        // Initialize game
        function initGame() {
            // Initialize audio system
            initAudio();
            // Create players
            players = [
                new Player(100, 400, 30, 50, '#ff5e00', 'fire', {
                    left: 'KeyA',
                    right: 'KeyD',
                    up: 'KeyW',
                    shoot: 'KeyF'
                }),
                new Player(700, 400, 30, 50, '#00b4db', 'water', {
                    left: 'ArrowLeft',
                    right: 'ArrowRight',
                    up: 'ArrowUp',
                    shoot: 'ControlLeft'
                })
            ];
            
            // Create platforms - Clean symmetrical design with ample spacing
            platforms = [
                // Ground level (y: 550) - Full width base
                new Platform(0, 550, WORLD_WIDTH, 20, '#0f3460'),

                // Level 1 (y: 450) - Wide landing platforms
                new Platform(120, 450, 120, 20),
                new Platform(720, 450, 120, 20),

                // Level 2 (y: 350) - Symmetrical platforms
                new Platform(80, 350, 100, 20),
                new Platform(430, 350, 100, 20), // Center platform
                new Platform(780, 350, 100, 20),

                // Level 3 (y: 250) - Alternating pattern
                new Platform(200, 250, 120, 20),
                new Platform(640, 250, 120, 20),

                // Level 4 (y: 150) - Three platform spread
                new Platform(60, 150, 100, 20),
                new Platform(430, 150, 100, 20),
                new Platform(800, 150, 100, 20),

                // Level 5 (y: 50) - Narrow crossing
                new Platform(320, 50, 120, 20),
                new Platform(520, 50, 120, 20),

                // Level 6 (y: -50) - Side platforms
                new Platform(150, -50, 100, 20),
                new Platform(710, -50, 100, 20),

                // Level 7 (y: -150) - Center focus
                new Platform(380, -150, 200, 20),

                // Level 8 (y: -250) - Triple jump
                new Platform(100, -250, 80, 20),
                new Platform(440, -250, 80, 20),
                new Platform(780, -250, 80, 20),

                // Level 9 (y: -350) - Narrow bridges
                new Platform(250, -350, 100, 20),
                new Platform(610, -350, 100, 20),

                // Level 10 (y: -450) - Final approach
                new Platform(180, -450, 120, 20),
                new Platform(660, -450, 120, 20),

                // Level 11 (y: -550) - Boss platform approach
                new Platform(380, -550, 200, 20),

                // Final platform at the very top (y: -650)
                new Platform(330, -650, 300, 30, '#ffff00'), // Golden finish platform
            ];
            
            // Create traps - Symmetrical placement with strategic positioning
            traps = [
                // Level 1 gaps - Spikes between platforms
                new Trap(280, 430, 60, 20, 'spike', 15),
                new Trap(620, 430, 60, 20, 'spike', 15),

                // Level 2 hazards - Water/Lava pools
                new Trap(220, 330, 50, 20, 'water', 12),
                new Trap(690, 330, 50, 20, 'lava', 12),

                // Level 3 gaps - Spike pits
                new Trap(360, 230, 80, 20, 'spike', 18),
                new Trap(520, 230, 80, 20, 'spike', 18),

                // Level 4 side hazards
                new Trap(200, 130, 50, 20, 'lava', 15),
                new Trap(710, 130, 50, 20, 'water', 15),

                // Level 5 center gap
                new Trap(480, 30, 40, 20, 'spike', 20),

                // Level 6 outer traps
                new Trap(50, -70, 60, 20, 'water', 18),
                new Trap(850, -70, 60, 20, 'lava', 18),

                // Level 8 between platforms
                new Trap(220, -270, 60, 20, 'spike', 22),
                new Trap(560, -270, 60, 20, 'spike', 22),
                new Trap(700, -270, 60, 20, 'lava', 20),

                // Level 9 approach hazards
                new Trap(390, -370, 60, 20, 'water', 20),
                new Trap(550, -370, 60, 20, 'lava', 20),

                // Level 10 final challenge
                new Trap(340, -470, 60, 20, 'spike', 25),
                new Trap(580, -470, 60, 20, 'spike', 25),
            ];
            
            // Create weapons - Symmetrical distribution
            weapons = [
                // Level 2 - Early weapons
                new Weapon(130, 330, 'pistol'),
                new Weapon(830, 330, 'pistol'),
                
                // Level 4 - Mid-level upgrades
                new Weapon(110, 130, 'shotgun'),
                new Weapon(850, 130, 'shotgun'),
                
                // Level 7 - Advanced weapons
                new Weapon(430, -170, 'pistol'),
                
                // Level 9 - Final weapons
                new Weapon(300, -370, 'shotgun'),
                new Weapon(660, -370, 'shotgun'),
            ];
            
            // Create abilities - Balanced symmetrical placement
            abilities = [
                // Level 1 - Starting abilities
                new Ability(170, 430, 'speed'),
                new Ability(790, 430, 'speed'),
                
                // Level 3 - Mid abilities
                new Ability(250, 230, 'shield'),
                new Ability(690, 230, 'shield'),
                
                // Level 5 - High abilities
                new Ability(370, 30, 'rapid'),
                new Ability(570, 30, 'rapid'),
                
                // Level 8 - Elite abilities
                new Ability(150, -270, 'speed'),
                new Ability(810, -270, 'speed'),
                
                // Level 10 - Final power-ups
                new Ability(230, -470, 'shield'),
                new Ability(710, -470, 'shield'),
            ];
            
            // Create victory door at the top
            victoryDoor = new VictoryDoor(
                WORLD_WIDTH / 2 - 25, // Center door horizontally
                -680, // Position on the final platform
                50, // Width
                60  // Height
            );
            
            // Create boss at the top of the map (centered in 960px width) - optional
            // boss = new Boss();
            // boss.x = WORLD_WIDTH / 2 - 40; // Center boss horizontally
            // boss.y = -700; // Position boss on the final platform level
            // bossHealth.classList.remove('hidden');
            boss = null; // Remove boss for door victory mode
            
            // Reset health bars (player health bars now drawn above characters)
            // fireboyHealth.style.width = '100%';
            // watergirlHealth.style.width = '100%';
            // bossHealthFill.style.width = '100%'; // No boss in door victory mode
            
            // Reset victory state
            champion = null;
            confetti = [];
            
            gameState = 'playing';
            gameStatus.classList.add('hidden');
            
            // Start background music
            playBackgroundMusic();
        }
        
        // Enhanced collision detection
        function checkCollision(obj1, obj2) {
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }
        
        // Precise collision for bullets and small objects
        function isColliding(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }
        
        // Check point collision
        function checkPointCollision(point, obj) {
            return point.x > obj.x &&
                   point.x < obj.x + obj.width &&
                   point.y > obj.y &&
                   point.y < obj.y + obj.height;
        }
        
        // Checkpoint management functions
        function updateCheckpoints() {
            // Find the highest level any player has reached
            let highestLevel = 0;
            players.forEach(player => {
                const playerLevel = getPlayerCheckpointLevel(player.y);
                if (playerLevel > highestLevel) {
                    highestLevel = playerLevel;
                }
            });
            
            // Update current checkpoint if players have progressed
            if (highestLevel > currentCheckpoint.level) {
                currentCheckpoint.level = highestLevel;
                currentCheckpoint.y = getCheckpointY(highestLevel);
                currentCheckpoint.platforms = getPlatformsAtLevel(highestLevel);
            }
        }
        
        function getPlayerCheckpointLevel(y) {
            if (y >= 500) return 0;      // Ground level
            else if (y >= 350) return 1; // Level 1
            else if (y >= 150) return 2; // Level 2  
            else if (y >= -50) return 3; // Level 3
            else if (y >= -200) return 4; // Level 4
            else if (y >= -350) return 5; // Level 5
            else if (y >= -500) return 6; // Level 6
            else if (y >= -650) return 7; // Level 7
            else if (y >= -800) return 8; // Level 8
            else return 9;               // Level 9+ (top)
        }
        
        function getCheckpointY(level) {
            const levelYMap = {
                0: 400,   // Ground level spawn
                1: 380,   // Level 1 spawn
                2: 280,   // Level 2 spawn
                3: 80,    // Level 3 spawn
                4: -120,  // Level 4 spawn
                5: -270,  // Level 5 spawn
                6: -420,  // Level 6 spawn
                7: -570,  // Level 7 spawn
                8: -720,  // Level 8 spawn
                9: -870   // Level 9+ spawn
            };
            return levelYMap[level] || 400;
        }
        
        function getPlatformsAtLevel(level) {
            return platforms.filter(platform => platform.checkpointLevel === level);
        }
        
        function findBestRespawnPosition(player) {
            // Get the other player's position
            const otherPlayer = players.find(p => p !== player);
            
            if (!otherPlayer) {
                // Single player mode - use current checkpoint
                return {
                    x: player.type === 'fire' ? 100 : 200,
                    y: currentCheckpoint.y
                };
            }
            
            // Find appropriate spawn level - not too far from other player
            const otherPlayerLevel = getPlayerCheckpointLevel(otherPlayer.y);
            const maxLevelDifference = 3; // Don't spawn more than 3 levels apart
            
            let respawnLevel = Math.max(0, otherPlayerLevel - maxLevelDifference);
            
            // Don't spawn below the current checkpoint
            respawnLevel = Math.max(respawnLevel, Math.max(0, currentCheckpoint.level - 2));
            
            const respawnY = getCheckpointY(respawnLevel);
            const levelPlatforms = getPlatformsAtLevel(respawnLevel);
            
            // Find a suitable platform at this level
            let spawnX = player.type === 'fire' ? 100 : 200;
            
            if (levelPlatforms.length > 0) {
                // Choose platform closest to other player's X position
                const targetX = otherPlayer ? otherPlayer.x : canvas.width / 2;
                const closestPlatform = levelPlatforms.reduce((closest, platform) => {
                    const platCenterX = platform.x + platform.width / 2;
                    const closestCenterX = closest.x + closest.width / 2;
                    return Math.abs(platCenterX - targetX) < Math.abs(closestCenterX - targetX) 
                        ? platform : closest;
                });
                
                // Spawn on the platform, with slight offset for each player
                spawnX = closestPlatform.x + (player.type === 'fire' ? 10 : closestPlatform.width - 40);
                spawnX = Math.max(0, Math.min(spawnX, WORLD_WIDTH - player.width));
            }
            
            return {
                x: spawnX,
                y: respawnY
            };
        }
        
        // Update camera to follow players with dynamic zoom
        function updateCamera() {
            if (players.length >= 2) {
                const player1 = players[0];
                const player2 = players[1];
                
                // Calculate distance between players
                const distanceX = Math.abs(player1.x - player2.x);
                const distanceY = Math.abs(player1.y - player2.y);
                
                // Calculate center point between players
                const centerX = (player1.x + player2.x) / 2;
                const centerY = (player1.y + player2.y) / 2;
                
                // Calculate required zoom based on distance, with width constraints
                const maxVerticalDistance = 400; // Maximum comfortable vertical distance
                const maxHorizontalDistance = WORLD_WIDTH * 0.8; // 80% of world width before we need to zoom
                
                let targetZoom = 1.0;
                
                // Check if vertical distance requires zoom out
                if (distanceY > maxVerticalDistance) {
                    const verticalZoomNeeded = maxVerticalDistance / distanceY;
                    targetZoom = Math.min(targetZoom, verticalZoomNeeded);
                }
                
                // Check if horizontal distance would expose blank areas
                if (distanceX > maxHorizontalDistance) {
                    // Instead of zooming out horizontally, we limit the zoom based on canvas width
                    // Calculate minimum zoom that keeps the 960px world width filling the canvas
                    const minZoomForWidth = Math.max(0.6, canvas.width / WORLD_WIDTH);
                    targetZoom = Math.max(targetZoom, minZoomForWidth);
                }
                
                // Apply zoom limits
                const minZoom = Math.max(0.4, canvas.width / WORLD_WIDTH); // Don't zoom out beyond world width
                const maxZoom = 1.2;
                camera.targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));
                
                // Set target camera position to center between players
                camera.targetX = centerX - canvas.width * 0.5 / camera.targetZoom;
                camera.targetY = centerY - canvas.height * 0.5 / camera.targetZoom;
                
                // Constrain horizontal camera position to keep world within view
                const maxCameraX = Math.max(0, WORLD_WIDTH - canvas.width / camera.targetZoom);
                camera.targetX = Math.max(0, Math.min(camera.targetX, maxCameraX));
                
                // Smooth camera movement
                camera.x += (camera.targetX - camera.x) * camera.smoothing;
                camera.y += (camera.targetY - camera.y) * camera.smoothing;
                camera.zoom += (camera.targetZoom - camera.zoom) * camera.zoomSmoothing;
                
                // Don't go below the ground level (adjusted for zoom)
                if (camera.y > 0) {
                    camera.y = 0;
                }
            } else if (players.length === 1) {
                // Single player mode - follow that player
                const player = players[0];
                camera.targetX = player.x - canvas.width * 0.5;
                camera.targetY = player.y - canvas.height * 0.7;
                camera.targetZoom = 1.0;
                
                // Constrain horizontal camera position
                const maxCameraX = Math.max(0, WORLD_WIDTH - canvas.width);
                camera.targetX = Math.max(0, Math.min(camera.targetX, maxCameraX));
                
                camera.x += (camera.targetX - camera.x) * camera.smoothing;
                camera.y += (camera.targetY - camera.y) * camera.smoothing;
                camera.zoom += (camera.targetZoom - camera.zoom) * camera.zoomSmoothing;
                
                if (camera.y > 0) {
                    camera.y = 0;
                }
            }
        }
        
        // Draw background with height-based gradient
        function drawBackground() {
            // Create gradient based on camera height
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            
            // Colors change based on height
            if (camera.y > -200) {
                // Ground level - dark blue to lighter blue
                gradient.addColorStop(0, '#0f0f23');
                gradient.addColorStop(1, '#16213e');
            } else if (camera.y > -500) {
                // Mid level - purple tones
                gradient.addColorStop(0, '#1a0a2e');
                gradient.addColorStop(1, '#16213e');
            } else {
                // High level - darker, space-like
                gradient.addColorStop(0, '#0a0a0a');
                gradient.addColorStop(1, '#1a0a2e');
            }
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add some stars at higher levels
            if (camera.y < -300) {
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 50; i++) {
                    const x = (i * 137) % canvas.width; // Pseudo-random positions
                    const y = ((i * 91) % canvas.height) - (camera.y * 0.1) % canvas.height;
                    if (y >= 0 && y <= canvas.height) {
                        ctx.fillRect(x, y, 2, 2);
                    }
                }
            }
        }
        
        // Game loop
        function gameLoop() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (gameState === 'playing') {
                // Draw background
                drawBackground();
                
                // Update checkpoints
                updateCheckpoints();
                
                // Update camera
                updateCamera();
                
                // Apply camera transformations
                ctx.save();
                ctx.scale(camera.zoom, camera.zoom);
                ctx.translate(0, 0); // We handle Y translation in individual draw calls
                // Update and draw platforms
                platforms.forEach(platform => {
                    platform.draw();
                    
                    // Enhanced platform collision with players
                    players.forEach(player => {
                        if (checkCollision(player, platform)) {
                            if (player.velocity.y > 0 && player.y < platform.y) {
                                // Landing on top of platform
                                player.y = platform.y - player.height;
                                player.velocity.y = 0;
                                player.isOnGround = true;
                            } else if (player.velocity.y < 0 && player.y > platform.y) {
                                // Hitting platform from below
                                player.y = platform.y + platform.height;
                                player.velocity.y = 0;
                            } else if (player.velocity.x > 0) {
                                // Hitting platform from left
                                player.x = platform.x - player.width;
                            } else if (player.velocity.x < 0) {
                                // Hitting platform from right
                                player.x = platform.x + platform.width;
                            }
                        }
                    });
                });
                
                // Update and draw traps
                traps.forEach(trap => {
                    trap.draw();
                    
                    // Check trap collision with players
                    players.forEach(player => {
                        if (checkCollision(player, trap)) {
                            // Check if player is immune
                            if ((trap.type === 'lava' && player.type === 'fire') ||
                                (trap.type === 'water' && player.type === 'water')) {
                                return; // Immune to their own element
                            }
                            
                            // Apply damage with enhanced system
                            if (!player.isInvulnerable) {
                                player.takeDamage(trap.damage);
                            }
                        }
                    });
                });
                
                // Update and draw weapons
                weapons.forEach((weapon, index) => {
                    weapon.draw();
                    
                    // Check weapon collision with players
                    players.forEach(player => {
                        if (checkCollision(player, weapon)) {
                            player.weapon = weapon.type;
                            weapons.splice(index, 1);
                        }
                    });
                });
                
                // Update and draw abilities
                abilities.forEach((ability, index) => {
                ability.draw();

                // Check ability collision with players (use player center)
                players.forEach(player => {
                    const playerCenterX = player.x + player.width / 2;
                    const playerCenterY = player.y + player.height / 2;
                    const dx = playerCenterX - ability.x;
                    const dy = playerCenterY - ability.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < player.width / 2 + ability.radius) {
                        // Apply ability effect
                        // (Simplified for this example)
                        abilities.splice(index, 1);
                    }
                });
            });
                
                // Update and draw bullets
                bullets.forEach((bullet, index) => {
                    bullet.update();
                    bullet.draw();
                    
                    // Remove bullets that are off screen (considering camera position and zoom)
                    if (bullet.x < 0 || bullet.x > WORLD_WIDTH ||
                        bullet.y < camera.y / camera.zoom - 100 || bullet.y > camera.y / camera.zoom + canvas.height / camera.zoom + 100) {
                        bullets.splice(index, 1);
                        return;
                    }
                    
                    // Check bullet collision with players
                    players.forEach(player => {
                        if (isColliding(bullet, player)) {
                            // Don't damage player with their own element
                            if (player.type !== bullet.type && !player.isInvulnerable) {
                                player.takeDamage(bullet.damage);
                                player.applyKnockback(bullet.vx, bullet.vy);
                                bullets.splice(index, 1);
                                
                                // Check for game over
                                if (player.health <= 0) {
                                    gameOver(player.type === 'fire' ? 'Watergirl' : 'Fireboy');
                                }
                            }
                        }
                    });
                    
                    // Check bullet collision with boss
                    if (boss && Math.sqrt((boss.x - bullet.x) ** 2 + (boss.y - bullet.y) ** 2) < 
                        boss.width/2 + bullet.radius) {
                        if (boss.takeDamage(bullet.damage)) {
                            // Boss defeated
                            levelUp();
                        }
                        bullets.splice(index, 1);
                    }
                });
                
                // Update and draw players
                players.forEach(player => {
                    player.update();
                    player.draw();
                });
                
                // Check victory condition
                checkVictoryCondition();
                
                // Draw victory door
                if (victoryDoor) {
                    victoryDoor.draw();
                }
                
                // Update and draw boss (if enabled)
                if (boss) {
                    boss.update();
                    boss.draw();
                    
                    // Check boss collision with players
                    players.forEach(player => {
                        if (checkCollision(player, boss)) {
                            player.takeDamage(1);
                        }
                    });
                }
                
                // Update and draw confetti
                confetti = confetti.filter(particle => {
                    particle.update();
                    particle.draw();
                    return particle.life > 0;
                });
                
                // Restore canvas transformation
                ctx.restore();
            } else if (gameState === 'victory') {
                // Continue updating confetti during victory screen
                confetti = confetti.filter(particle => {
                    particle.update();
                    // Draw confetti without camera transformation for victory screen
                    if (particle.life <= 0) return false;
                    
                    ctx.save();
                    const alpha = particle.life / particle.maxLife;
                    ctx.globalAlpha = alpha;
                    ctx.translate(particle.x, particle.y);
                    ctx.rotate(particle.rotation);
                    
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                    
                    ctx.restore();
                    return true;
                });
                
                // Draw victory screen
                drawVictoryScreen();
            }
            
            requestAnimationFrame(gameLoop);
        }
        
        // Create confetti burst
        function createConfetti(x, y, amount = 50) {
            for (let i = 0; i < amount; i++) {
                confetti.push(new ConfettiParticle(x, y));
            }
        }
        
        // Check victory condition
        function checkVictoryCondition() {
            if (champion || !victoryDoor) return;
            
            players.forEach(player => {
                if (checkCollision(player, victoryDoor)) {
                    champion = player.type === 'fire' ? 'FIRE WARRIOR' : 'WATER GUARDIAN';
                    
                    // Create confetti burst at door location
                    createConfetti(
                        victoryDoor.x + victoryDoor.width/2, 
                        victoryDoor.y + victoryDoor.height/2, 
                        80
                    );
                    
                    // Additional confetti bursts for celebration
                    setTimeout(() => createConfetti(WORLD_WIDTH * 0.25, victoryDoor.y, 30), 300);
                    setTimeout(() => createConfetti(WORLD_WIDTH * 0.75, victoryDoor.y, 30), 600);
                    setTimeout(() => createConfetti(WORLD_WIDTH * 0.5, victoryDoor.y - 100, 40), 900);
                    
                    gameState = 'victory';
                }
            });
        }
        
        // Game over function
        function gameOver(winner) {
            gameState = 'gameover';
            statusTitle.textContent = 'GAME OVER';
            statusMessage.textContent = `${winner} wins the match!`;
            resetButton.classList.remove('hidden');
            gameStatus.classList.remove('hidden');
        }
        
        // Draw victory screen
        function drawVictoryScreen() {
            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Champion title
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CHAMPION!', canvas.width / 2, canvas.height / 2 - 80);
            
            // Winner announcement
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 32px monospace';
            ctx.fillText(champion, canvas.width / 2, canvas.height / 2 - 20);
            
            // Victory message
            ctx.font = '20px monospace';
            ctx.fillText('First to reach the Victory Door!', canvas.width / 2, canvas.height / 2 + 20);
            
            // Replay button
            const buttonWidth = 200;
            const buttonHeight = 50;
            const buttonX = canvas.width / 2 - buttonWidth / 2;
            const buttonY = canvas.height / 2 + 60;
            
            // Button background
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
            
            // Button border
            ctx.strokeStyle = '#45a049';
            ctx.lineWidth = 3;
            ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
            
            // Button text
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 18px monospace';
            ctx.fillText('PLAY AGAIN', canvas.width / 2, buttonY + buttonHeight / 2 + 6);
            
            // Store button bounds for click detection
            window.replayButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
        }
        
        // Level up function
        function levelUp() {
            level++;
            if (level > 3) {
                statusTitle.textContent = 'VICTORY!';
                statusMessage.textContent = 'You have defeated all bosses!';
                gameState = 'gameover';
                resetButton.classList.remove('hidden');
                gameStatus.classList.remove('hidden');
            } else {
                // For simplicity, we'll just reset the game with a new level
                document.querySelector('#score-board span').textContent = `LEVEL: ${level}`;
                initGame();
            }
        }
        
        // Event listeners
        startButton.addEventListener('click', () => {
            initGame();
        });
        
        resetButton.addEventListener('click', () => {
            level = 1;
            document.querySelector('#score-board span').textContent = `LEVEL: ${level}`;
            initGame();
        });
        
        // Keyboard controls
        const keys = {};
        
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            
            // Handle player actions (jump is now handled in handleInput)
            if (gameState === 'playing') {
                players.forEach(player => {
                    if (e.code === player.controls.shoot) {
                        player.isShooting = true;
                    }
                });
                
                // Pause game with Escape key
                if (e.code === 'Escape') {
                    gameState = 'paused';
                    statusTitle.textContent = 'GAME PAUSED';
                    statusMessage.textContent = 'Press Escape to continue';
                    gameStatus.classList.remove('hidden');
                }
            } else if (gameState === 'paused' && e.code === 'Escape') {
                gameState = 'playing';
                gameStatus.classList.add('hidden');
            }
        });
        
        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
            
            if (gameState === 'playing') {
                players.forEach(player => {
                    if (e.code === player.controls.shoot) {
                        player.isShooting = false;
                    }
                });
            }
        });
        
        // Enhanced key handling is now integrated into player.handleInput()
        
        // Start the game
        gameLoop();
        
        // Handle canvas click events for replay button
        canvas.addEventListener('click', (e) => {
            if (gameState === 'victory' && window.replayButtonBounds) {
                const rect = canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                const bounds = window.replayButtonBounds;
                if (clickX >= bounds.x && clickX <= bounds.x + bounds.width &&
                    clickY >= bounds.y && clickY <= bounds.y + bounds.height) {
                    // Reset and restart game
                    level = 1;
                    champion = null;
                    confetti = [];
                    initGame();
                }
            }
        });
        
        // Adjust canvas on resize
        window.addEventListener('resize', () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        });
