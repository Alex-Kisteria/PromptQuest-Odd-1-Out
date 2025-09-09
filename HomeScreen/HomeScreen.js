
        document.getElementById('start-button').addEventListener('click', function() {
            // Redirect to the game page
            window.location.href = 'game.html';
            
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
