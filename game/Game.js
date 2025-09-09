
        // Game variables
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const gameStatus = document.getElementById('game-status');
        const statusTitle = document.getElementById('status-title');
        const statusMessage = document.getElementById('status-message');
        const startButton = document.getElementById('start-button');
        const resetButton = document.getElementById('reset-button');
        const fireboyHealth = document.querySelector('#fireboy-health .health-fill');
        const watergirlHealth = document.querySelector('#watergirl-health .health-fill');
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
        
        // Camera system with zoom
        let camera = {
            x: 0,
            y: 0,
            targetY: 0,
            zoom: 1,
            targetZoom: 1,
            smoothing: 0.05,
            zoomSmoothing: 0.02
        };
        
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
            }
            
            draw() {
                ctx.save();
                
                // Add invulnerability flashing effect
                if (this.isInvulnerable) {
                    ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
                }
                
                // Draw player body (adjusted for camera and zoom)
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Draw border for better pixel art look (adjusted for camera and zoom)
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y - camera.y / camera.zoom, this.width, this.height);
                
                // Draw player face (simple pixel art) - adjusted for camera and zoom
                ctx.fillStyle = '#000';
                if (this.facing === 'right') {
                    ctx.fillRect(this.x + this.width - 10, this.y - camera.y / camera.zoom + 10, 4, 4); // eye
                    ctx.fillRect(this.x + this.width - 5, this.y - camera.y / camera.zoom + 15, 3, 2); // mouth
                } else {
                    ctx.fillRect(this.x + 6, this.y - camera.y / camera.zoom + 10, 4, 4); // eye
                    ctx.fillRect(this.x + 2, this.y - camera.y / camera.zoom + 15, 3, 2); // mouth
                }
                
                // Draw simple eyes for better character definition - adjusted for camera and zoom
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x + 8, this.y - camera.y / camera.zoom + 8, 6, 6);
                ctx.fillRect(this.x + 18, this.y - camera.y / camera.zoom + 8, 6, 6);
                
                // Draw mouth - adjusted for camera and zoom
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x + 12, this.y - camera.y / camera.zoom + 20, 8, 4);
                
                // Draw weapon - adjusted for camera and zoom
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
                
                ctx.restore();
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
                
                // Boundary check
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
                
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
            }
            
            takeDamage(amount) {
                if (this.isInvulnerable) return false;
                
                this.health -= amount;
                if (this.health < 0) this.health = 0;
                
                // Add invulnerability frames
                this.isInvulnerable = true;
                this.invulnerabilityTime = 1000; // 1 second of invulnerability
                
                // Update health bar
                if (this.type === 'fire') {
                    fireboyHealth.style.width = this.health + '%';
                } else {
                    watergirlHealth.style.width = this.health + '%';
                }
                
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
                this.x = this.type === 'fire' ? 100 : 200;
                // Respawn at camera level or ground level, whichever is higher
                this.y = Math.min(400, camera.y + canvas.height - 150);
                this.velocity.x = 0;
                this.velocity.y = 0;
                
                // Update health bar
                if (this.type === 'fire') {
                    fireboyHealth.style.width = '100%';
                } else {
                    watergirlHealth.style.width = '100%';
                }
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
                    shoot: 'KeyM'
                })
            ];
            
            // Create platforms - Extended vertically upward
            platforms = [
                // Ground level (y: 550)
                new Platform(0, 550, 200, 20, '#ffff'),
                new Platform(200, 550, 150, 20, '#ffff'),
                new Platform(1000, 550, 1000, 20, '#0f3460'),

                // Level 1 (y: 450)
                new Platform(50, 450, 100, 20),
                new Platform(250, 450, 150, 20),
                new Platform(550, 400, 150, 20),
                new Platform(1800, 450, 200, 20),

                // Level 2 (y: 350)
                new Platform(50, 300, 100, 20),
                new Platform(200, 300, 150, 20),
                new Platform(400, 350, 100, 20),
                new Platform(700, 300, 100, 20),
                new Platform(1600, 350, 150, 20),

                // Level 3 (y: 200)
                new Platform(800, 200, 200, 20),
                new Platform(100, 200, 120, 20),
                new Platform(300, 150, 100, 20),
                new Platform(500, 100, 80, 20),

                // Level 4 (y: 100)
                new Platform(1000, 100, 100, 20),
                new Platform(1200, 150, 150, 20),
                new Platform(1400, 250, 200, 20),

                // NEW VERTICAL SECTIONS - Going much higher
                // Level 5 (y: 0 to -100)
                new Platform(150, 0, 100, 20),
                new Platform(400, -50, 120, 20),
                new Platform(650, -20, 100, 20),
                new Platform(900, -80, 150, 20),

                // Level 6 (y: -150 to -250)
                new Platform(200, -150, 80, 20),
                new Platform(350, -200, 100, 20),
                new Platform(550, -180, 120, 20),
                new Platform(750, -220, 100, 20),
                new Platform(950, -160, 80, 20),

                // Level 7 (y: -300 to -400)
                new Platform(100, -300, 100, 20),
                new Platform(300, -350, 120, 20),
                new Platform(500, -320, 100, 20),
                new Platform(700, -380, 150, 20),
                new Platform(900, -340, 80, 20),

                // Level 8 (y: -450 to -550)
                new Platform(150, -450, 80, 20),
                new Platform(350, -500, 100, 20),
                new Platform(600, -480, 120, 20),
                new Platform(800, -520, 100, 20),

                // Level 9 (y: -600 to -700)
                new Platform(200, -600, 100, 20),
                new Platform(400, -650, 80, 20),
                new Platform(650, -620, 120, 20),
                new Platform(850, -680, 100, 20),

                // Level 10 - Top section (y: -750 to -850)
                new Platform(250, -750, 150, 20),
                new Platform(500, -800, 200, 20),
                new Platform(750, -780, 120, 20),

                // Final platform at the very top
                new Platform(400, -900, 300, 30, '#ffff00'), // Golden finish platform
            ];
            
            // Create traps - Extended vertically
            traps = [
                // Ground level traps
                new Trap(150, 530, 50, 20, 'spike', 15),
                new Trap(300, 430, 50, 20, 'water', 10),
                new Trap(600, 380, 50, 20, 'spike', 15),
                new Trap(850, 180, 50, 20, 'spike', 15),
                new Trap(1300, 130, 50, 20, 'lava', 10),
                new Trap(1500, 230, 50, 20, 'spike', 15),
                new Trap(1700, 330, 50, 20, 'water', 10),
                new Trap(1900, 430, 50, 20, 'lava', 10),
                
                // Upper level traps
                new Trap(250, -30, 40, 15, 'spike', 20),
                new Trap(470, -130, 50, 20, 'lava', 15),
                new Trap(680, -180, 40, 15, 'spike', 20),
                new Trap(820, -240, 50, 20, 'water', 15),
                new Trap(120, -320, 40, 15, 'spike', 25),
                new Trap(420, -370, 50, 20, 'lava', 20),
                new Trap(720, -400, 40, 15, 'spike', 25),
                new Trap(180, -470, 50, 20, 'water', 20),
                new Trap(520, -500, 40, 15, 'spike', 30),
                new Trap(680, -640, 50, 20, 'lava', 25),
                new Trap(380, -680, 40, 15, 'spike', 30),
                new Trap(580, -800, 50, 20, 'water', 25),
            ];
            
            // Create weapons - Extended vertically
            weapons = [
                new Weapon(150, 130, 'pistol'),
                new Weapon(650, 130, 'shotgun'),
                new Weapon(320, -70, 'pistol'),
                new Weapon(570, -220, 'shotgun'),
                new Weapon(420, -370, 'pistol'),
                new Weapon(720, -520, 'shotgun'),
                new Weapon(480, -700, 'pistol'),
            ];
            
            // Create abilities - Extended vertically
            abilities = [
                new Ability(400, 80, 'speed'),
                new Ability(200, 80, 'shield'),
                new Ability(600, 80, 'rapid'),
                new Ability(250, -100, 'speed'),
                new Ability(450, -250, 'shield'),
                new Ability(650, -350, 'rapid'),
                new Ability(350, -500, 'speed'),
                new Ability(550, -650, 'shield'),
                new Ability(450, -800, 'rapid'),
            ];
            
            // Create boss at the top of the map
            boss = new Boss();
            boss.y = -850; // Move boss to the top of the vertical map
            bossHealth.classList.remove('hidden');
            
            // Reset health bars
            fireboyHealth.style.width = '100%';
            watergirlHealth.style.width = '100%';
            bossHealthFill.style.width = '100%';
            
            gameState = 'playing';
            gameStatus.classList.add('hidden');
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
        
        // Update camera to follow players with dynamic zoom
        function updateCamera() {
            if (players.length >= 2) {
                const player1 = players[0];
                const player2 = players[1];
                
                // Calculate distance between players
                const distanceX = Math.abs(player1.x - player2.x);
                const distanceY = Math.abs(player1.y - player2.y);
                const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                // Calculate center point between players
                const centerX = (player1.x + player2.x) / 2;
                const centerY = (player1.y + player2.y) / 2;
                
                // Calculate required zoom based on distance
                const maxViewDistance = 400; // Maximum comfortable distance before zooming out
                const minZoom = 0.4; // Minimum zoom level
                const maxZoom = 1.2; // Maximum zoom level
                
                if (totalDistance > maxViewDistance) {
                    // Zoom out to keep both players visible
                    camera.targetZoom = Math.max(minZoom, maxViewDistance / totalDistance);
                } else {
                    // Zoom back in when players are close
                    camera.targetZoom = Math.min(maxZoom, 1.0);
                }
                
                // Set target camera position to center between players
                camera.targetY = centerY - canvas.height * 0.5 / camera.targetZoom;
                
                // Smooth camera movement
                camera.y += (camera.targetY - camera.y) * camera.smoothing;
                camera.zoom += (camera.targetZoom - camera.zoom) * camera.zoomSmoothing;
                
                // Don't go below the ground level (adjusted for zoom)
                if (camera.y > 0) {
                    camera.y = 0;
                }
            } else if (players.length === 1) {
                // Single player mode - follow that player
                const player = players[0];
                camera.targetY = player.y - canvas.height * 0.7;
                camera.targetZoom = 1.0;
                
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
                    
                    // Check ability collision with players
                    players.forEach(player => {
                        if (Math.sqrt((player.x - ability.x) ** 2 + (player.y - ability.y) ** 2) < 
                            player.width/2 + ability.radius) {
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
                    if (bullet.x < 0 || bullet.x > canvas.width / camera.zoom ||
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
                
                // Update and draw boss
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
                
                // Restore canvas transformation
                ctx.restore();
            }
            
            requestAnimationFrame(gameLoop);
        }
        
        // Game over function
        function gameOver(winner) {
            gameState = 'gameover';
            statusTitle.textContent = 'GAME OVER';
            statusMessage.textContent = `${winner} wins the match!`;
            resetButton.classList.remove('hidden');
            gameStatus.classList.remove('hidden');
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
        
        // Adjust canvas on resize
        window.addEventListener('resize', () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        });
