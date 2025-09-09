document.getElementById('start-button').addEventListener('click', function() {
            // Redirect to the game page
            window.location.href = '/game/Game.html';
            
            // For demonstration purposes, show a message since game.html doesn't exist
            // In a real scenario, you would remove this and just use the redirect
            alert('Redirecting to the game... In a real implementation, this would take you to game.html');
        });
        
        // Add some interactive effects
        const startBtn = document.getElementById('start-button');
        
        startBtn.addEventListener('mouseover', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        startBtn.addEventListener('mouseout', function() {
            this.style.transform = 'scale(1)';
        });
        
        // Add keyboard event to start game with Enter key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                startBtn.click();
            }
        });
        
        // Sparkling stars background
function createStars(numStars = 40) {
    const colors = ['#fff', '#0ff', '#0f0', '#f00', '#00f']; // white, cyan, green, red, blue
    const colorChoices = ['#fff', '#0f0', '#f00', '#00f']; // white, green, red, blue
    let starsBg = document.querySelector('.stars-bg');
    if (!starsBg) return;
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2 + 1;
        star.style.width = `${size + 1}px`;
        star.style.height = `${size + 1}px`;
        star.style.top = `${Math.random() * 100}vh`;
        star.style.left = `${Math.random() * 100}vw`;
        star.style.opacity = 0.15 + Math.random() * 0.15;
        star.style.background = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        star.style.boxShadow = `0 0 8px 2px ${star.style.background}, 0 0 16px 4px ${star.style.background}44`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        starsBg.appendChild(star);
    }
}
createStars();
