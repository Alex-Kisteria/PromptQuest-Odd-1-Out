
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
                this.weapon = 'pistol';
                this.controls = controls;
                this.isShooting = false;
                this.shootCooldown = 0;
                this.facing = 'right';
                this.isOnGround = false;
            }
            
            draw() {
                // Draw player body
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Draw player face (simple pixel art)
                ctx.fillStyle = '#000';
                if (this.facing === 'right') {
                    ctx.fillRect(this.x + this.width - 10, this.y + 10, 4, 4); // eye
                    ctx.fillRect(this.x + this.width - 5, this.y + 15, 3, 2); // mouth
                } else {
                    ctx.fillRect(this.x + 6, this.y + 10, 4, 4); // eye
                    ctx.fillRect(this.x + 2, this.y + 15, 3, 2); // mouth
                }
                
                // Draw weapon
                ctx.fillStyle = '#777';
                if (this.weapon === 'pistol') {
                    if (this.facing === 'right') {
                        ctx.fillRect(this.x + this.width, this.y + this.height/2 - 2, 10, 4);
                    } else {
                        ctx.fillRect(this.x - 10, this.y + this.height/2 - 2, 10, 4);
                    }
                } else if (this.weapon === 'shotgun') {
                    if (this.facing === 'right') {
                        ctx.fillRect(this.x + this.width, this.y + this.height/2 - 3, 15, 6);
                    } else {
                        ctx.fillRect(this.x - 15, this.y + this.height/2 - 3, 15, 6);
                    }
                }
            }
            
            update() {
                // Movement
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                
                // Gravity
                if (this.y + this.height + this.velocity.y <= canvas.height) {
                    this.velocity.y += 0.5;
                } else {
                    this.velocity.y = 0;
                    this.y = canvas.height - this.height;
                    this.isOnGround = true;
                }
                
                // Apply friction
                this.velocity.x *= 0.9;
                
                // Boundary check
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
                
                // Shooting cooldown
                if (this.shootCooldown > 0) {
                    this.shootCooldown--;
                }
                
                // Shoot if needed
                if (this.isShooting && this.shootCooldown === 0) {
                    this.shoot();
                    this.shootCooldown = this.weapon === 'pistol' ? 20 : 40;
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
                this.health -= amount;
                if (this.health < 0) this.health = 0;
                
                // Update health bar
                if (this.type === 'fire') {
                    fireboyHealth.style.width = this.health + '%';
                } else {
                    watergirlHealth.style.width = this.health + '%';
                }
                
                return this.health <= 0;
            }
        }
        
        // Bullet class
        class Bullet {
            constructor(x, y, radius, type, direction, weaponType, spread) {
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.type = type; // 'fire' or 'water'
                this.color = type === 'fire' ? '#ff5e00' : '#00b4db';
                this.velocity = { 
                    x: direction * (weaponType === 'pistol' ? 10 : 8),
                    y: (Math.random() - 0.5) * spread * 10
                };
                this.damage = weaponType === 'pistol' ? 10 : 5;
            }
            
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.closePath();
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
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Add platform details
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, this.width, this.height);
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
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Add trap details
                if (this.type === 'spike') {
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y + this.height);
                    for (let i = 0; i < this.width; i += 5) {
                        ctx.lineTo(this.x + i, this.y);
                        ctx.lineTo(this.x + i + 2.5, this.y + this.height);
                    }
                    ctx.lineTo(this.x + this.width, this.y);
                    ctx.lineTo(this.x + this.width, this.y + this.height);
                    ctx.closePath();
                    ctx.fillStyle = '#333';
                    ctx.fill();
                } else if (this.type === 'lava' || this.type === 'water') {
                    // Animated effect for liquids
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    for (let i = 0; i < this.width; i += 15) {
                        const waveHeight = Math.sin(Date.now() / 500 + i) * 3;
                        ctx.fillRect(this.x + i, this.y, 10, waveHeight);
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
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Add weapon details
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x + 5, this.y - 5, 10, 5);
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
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.closePath();
                
                // Pulsating effect
                const pulse = Math.sin(Date.now() / 200) * 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
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
                // Draw boss body
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Draw boss face
                ctx.fillStyle = '#000';
                ctx.fillRect(this.x + 20, this.y + 20, 10, 10); // left eye
                ctx.fillRect(this.x + 50, this.y + 20, 10, 10); // right eye
                ctx.fillRect(this.x + 30, this.y + 50, 20, 5); // mouth
                
                // Draw angry eyebrows
                ctx.beginPath();
                ctx.moveTo(this.x + 15, this.y + 15);
                ctx.lineTo(this.x + 30, this.y + 10);
                ctx.moveTo(this.x + 65, this.y + 15);
                ctx.lineTo(this.x + 50, this.y + 10);
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
                            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
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
            
            // Create platforms
            platforms = [
                // Ground
                new Platform(0, canvas.height - 40, canvas.width, 40, '#0f3460'),
                
                // Platforms
                new Platform(100, 350, 200, 20),
                new Platform(500, 350, 200, 20),
                new Platform(300, 250, 200, 20),
                new Platform(100, 150, 150, 20),
                new Platform(550, 150, 150, 20),
                new Platform(350, 100, 100, 20),
            ];
            
            // Create traps
            traps = [
                new Trap(350, canvas.height - 40, 100, 40, 'lava', 10),
                new Trap(600, 330, 50, 20, 'spike', 15),
                new Trap(250, 330, 50, 20, 'spike', 15),
                new Trap(400, 230, 50, 20, 'water', 10),
            ];
            
            // Create weapons
            weapons = [
                new Weapon(150, 130, 'pistol'),
                new Weapon(650, 130, 'shotgun')
            ];
            
            // Create abilities
            abilities = [
                new Ability(400, 80, 'speed'),
                new Ability(200, 80, 'shield'),
                new Ability(600, 80, 'rapid')
            ];
            
            // Create boss
            boss = new Boss();
            bossHealth.classList.remove('hidden');
            
            // Reset health bars
            fireboyHealth.style.width = '100%';
            watergirlHealth.style.width = '100%';
            bossHealthFill.style.width = '100%';
            
            gameState = 'playing';
            gameStatus.classList.add('hidden');
        }
        
        // Collision detection
        function checkCollision(obj1, obj2) {
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }
        
        // Check point collision
        function checkPointCollision(point, obj) {
            return point.x > obj.x &&
                   point.x < obj.x + obj.width &&
                   point.y > obj.y &&
                   point.y < obj.y + obj.height;
        }
        
        // Game loop
        function gameLoop() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (gameState === 'playing') {
                // Update and draw platforms
                platforms.forEach(platform => {
                    platform.draw();
                    
                    // Check platform collision with players
                    players.forEach(player => {
                        if (player.velocity.y > 0 &&
                            player.y + player.height <= platform.y &&
                            player.y + player.height + player.velocity.y >= platform.y &&
                            player.x + player.width > platform.x &&
                            player.x < platform.x + platform.width) {
                            player.y = platform.y - player.height;
                            player.velocity.y = 0;
                            player.isOnGround = true;
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
                            
                            player.takeDamage(trap.damage / 10);
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
                    
                    // Remove bullets that are off screen
                    if (bullet.x < 0 || bullet.x > canvas.width ||
                        bullet.y < 0 || bullet.y > canvas.height) {
                        bullets.splice(index, 1);
                        return;
                    }
                    
                    // Check bullet collision with players
                    players.forEach(player => {
                        if (Math.sqrt((player.x - bullet.x) ** 2 + (player.y - bullet.y) ** 2) < 
                            player.width/2 + bullet.radius) {
                            // Don't damage player with their own element
                            if (player.type !== bullet.type) {
                                if (player.takeDamage(bullet.damage)) {
                                    // Player died
                                    gameOver(player.type === 'fire' ? 'Watergirl' : 'Fireboy');
                                }
                                bullets.splice(index, 1);
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
            
            // Handle player movement and actions
            if (gameState === 'playing') {
                players.forEach(player => {
                    if (e.code === player.controls.up) {
                        player.jump();
                    }
                    
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
        
        // Handle continuous key presses
        function handleControls() {
            players.forEach(player => {
                if (keys[player.controls.left]) {
                    player.velocity.x = -player.speed;
                    player.facing = 'left';
                }
                
                if (keys[player.controls.right]) {
                    player.velocity.x = player.speed;
                    player.facing = 'right';
                }
            });
            
            requestAnimationFrame(handleControls);
        }
        
        // Start the game
        gameLoop();
        handleControls();
        
        // Adjust canvas on resize
        window.addEventListener('resize', () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        });
