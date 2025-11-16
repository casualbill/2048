// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // Initialize game with classic mode
  var gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  // Add mode selection functionality
  var classicModeBtn = document.getElementById('classic-mode');
  var primeModeBtn = document.getElementById('prime-mode');
  
  classicModeBtn.addEventListener('click', function() {
    classicModeBtn.classList.add('active');
    primeModeBtn.classList.remove('active');
    gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  });
  
  primeModeBtn.addEventListener('click', function() {
    primeModeBtn.classList.add('active');
    classicModeBtn.classList.remove('active');
    gameManager = new GameManager(5, KeyboardInputManager, HTMLActuator, LocalStorageManager, true);
  });
});
