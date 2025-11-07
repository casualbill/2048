// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var boardSize = 4;
  var gameManager = new GameManager(boardSize, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  // Add event listener for board size slider
  var sizeSlider = document.getElementById('size-slider');
  var sizeValue = document.getElementById('size-value');
  
  sizeSlider.addEventListener('input', function() {
    boardSize = parseInt(this.value);
    sizeValue.textContent = boardSize;
  });
  
  sizeSlider.addEventListener('change', function() {
    // Restart the game with the new board size
    gameManager = new GameManager(boardSize, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  });
});
