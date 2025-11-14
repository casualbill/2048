// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  // Mode selection
  var classicModeButton = document.getElementById('classic-mode');
  var mazeModeButton = document.getElementById('maze-mode');
  
  // Set initial active mode
  if (gameManager.gameMode === 'classic') {
    classicModeButton.classList.add('active');
    mazeModeButton.classList.remove('active');
  } else {
    mazeModeButton.classList.add('active');
    classicModeButton.classList.remove('active');
  }
  
  // Classic mode button click event
  classicModeButton.addEventListener('click', function() {
    gameManager.gameMode = 'classic';
    gameManager.walls = [];
    gameManager.storageManager.setGameMode('classic');
    gameManager.restart();
    classicModeButton.classList.add('active');
    mazeModeButton.classList.remove('active');
  });
  
  // Maze mode button click event
  mazeModeButton.addEventListener('click', function() {
    gameManager.gameMode = 'maze';
    gameManager.storageManager.setGameMode('maze');
    gameManager.restart();
    mazeModeButton.classList.add('active');
    classicModeButton.classList.remove('active');
  });
});
