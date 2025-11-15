// Leaderboard functionality
(function() {
    'use strict';

    // API base URL
    const API_BASE_URL = 'http://localhost:8080/api/v1';
    
    // DOM elements
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const closeBtn = document.querySelector('.close');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const scoreLeaderboard = document.getElementById('score-leaderboard');
    const timeLeaderboard = document.getElementById('time-leaderboard');

    // Initialize leaderboard
    function initLeaderboard() {
        // Event listeners
        leaderboardBtn.addEventListener('click', openLeaderboard);
        closeBtn.addEventListener('click', closeLeaderboard);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target == leaderboardModal) {
                closeLeaderboard();
            }
        });
        
        // Tab switching
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.dataset.tab;
                switchTab(tab);
            });
        });
    }

    // Open leaderboard modal
    function openLeaderboard() {
        leaderboardModal.style.display = 'block';
        
        // Load leaderboard data if not already loaded
        if (scoreLeaderboard.innerHTML.includes('Loading')) {
            loadScoreLeaderboard();
        }
        if (timeLeaderboard.innerHTML.includes('Loading')) {
            loadTimeLeaderboard();
        }
    }

    // Close leaderboard modal
    function closeLeaderboard() {
        leaderboardModal.style.display = 'none';
    }

    // Switch between tabs
    function switchTab(tab) {
        // Remove active class from all tabs
        tabBtns.forEach(btn => btn.classList.remove('active'));
        
        // Hide all content
        document.querySelectorAll('.leaderboard-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activate selected tab
        event.target.classList.add('active');
        
        // Show selected content
        const content = document.getElementById(`${tab}-leaderboard`);
        content.classList.add('active');
        
        // Load data if needed
        if (tab === 'score' && content.innerHTML.includes('Loading')) {
            loadScoreLeaderboard();
        } else if (tab === 'time' && content.innerHTML.includes('Loading')) {
            loadTimeLeaderboard();
        }
    }

    // Load score leaderboard
    function loadScoreLeaderboard() {
        fetch(`${API_BASE_URL}/game/leaderboard/score`)
            .then(response => response.json())
            .then(data => {
                renderLeaderboard(scoreLeaderboard, data, 'score');
            })
            .catch(error => {
                console.error('Error loading score leaderboard:', error);
                scoreLeaderboard.innerHTML = '<div class="loading">Failed to load leaderboard</div>';
            });
    }

    // Load time leaderboard
    function loadTimeLeaderboard() {
        fetch(`${API_BASE_URL}/game/leaderboard/time`)
            .then(response => response.json())
            .then(data => {
                renderLeaderboard(timeLeaderboard, data, 'time');
            })
            .catch(error => {
                console.error('Error loading time leaderboard:', error);
                timeLeaderboard.innerHTML = '<div class="loading">Failed to load leaderboard</div>';
            });
    }

    // Render leaderboard
    function renderLeaderboard(container, data, type) {
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="loading">No records found</div>';
            return;
        }

        // Get current player name
        const storageManager = new StorageManager();
        const currentPlayerName = storageManager.getItem('playerName') || '';

        // Create leaderboard list
        const ul = document.createElement('ul');
        ul.className = 'leaderboard-list';

        // Render each item
        data.forEach(item => {
            const li = document.createElement('li');
            li.className = `leaderboard-item${currentPlayerName === item.player_name ? ' current-player' : ''}`;

            const rankSpan = document.createElement('span');
            rankSpan.className = 'rank';
            rankSpan.textContent = item.rank;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = item.player_name;

            const scoreTimeSpan = document.createElement('span');
            scoreTimeSpan.className = 'score-time';
            
            if (type === 'score') {
                scoreTimeSpan.textContent = item.score;
            } else {
                // Format time as mm:ss.ms
                const time = item.game_time;
                const minutes = Math.floor(time / 60000);
                const seconds = Math.floor((time % 60000) / 1000);
                const milliseconds = time % 1000;
                scoreTimeSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            }

            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = new Date(item.created_at).toLocaleString();

            li.appendChild(rankSpan);
            li.appendChild(nameSpan);
            li.appendChild(scoreTimeSpan);
            li.appendChild(dateSpan);

            ul.appendChild(li);
        });

        container.innerHTML = '';
        container.appendChild(ul);
    }

    // Refresh leaderboard data
    function refreshLeaderboard() {
        // Clear existing content
        scoreLeaderboard.innerHTML = '<div class="loading">Loading...</div>';
        timeLeaderboard.innerHTML = '<div class="loading">Loading...</div>';
        
        // Reload data
        loadScoreLeaderboard();
        loadTimeLeaderboard();
    }

    // Export functions for external use
    window.Leaderboard = {
        init: initLeaderboard,
        refresh: refreshLeaderboard
    };

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', initLeaderboard);

})();