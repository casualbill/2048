// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var gridSize = 4;
  var gameManager = new GameManager(gridSize, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  // Set up grid size selector
  var gridSizeInput = document.getElementById('grid-size');
  var gridSizeValue = document.getElementById('grid-size-value');
  
  gridSizeInput.addEventListener('input', function() {
    gridSize = parseInt(this.value);
    gridSizeValue.textContent = gridSize + 'x' + gridSize;
  });
  
  gridSizeInput.addEventListener('change', function() {
    // Start a new game with the selected grid size
    gameManager = new GameManager(gridSize, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  });
  
  // Make gameManager globally accessible for debugging
  window.gameManager = gameManager;
  
  // Set up mouse drag to resize grid
  var gameContainer = document.querySelector('.game-container');
  var isDragging = false;
  var startX, startY;
  var originalWidth, originalHeight;
  var originalGridSize = gridSize;
  
  // Add resize handles to game container
  gameContainer.style.position = 'relative';
  gameContainer.style.cursor = 'ew-resize';
  
  // Mouse down event
  gameContainer.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    originalWidth = gameContainer.offsetWidth;
    originalHeight = gameContainer.offsetHeight;
    originalGridSize = gridSize;
    
    // Change cursor to resize pointer
    gameContainer.style.cursor = 'ew-resize';
  });
  
  // Mouse move event
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    // Calculate new width and height
    var deltaX = e.clientX - startX;
    var deltaY = e.clientY - startY;
    var newWidth = originalWidth + deltaX;
    var newHeight = originalHeight + deltaY;
    
    // Ensure minimum size
    newWidth = Math.max(newWidth, 300);
    newHeight = Math.max(newHeight, 300);
    
    // Ensure maximum size
    newWidth = Math.min(newWidth, window.innerWidth - 40);
    newHeight = Math.min(newHeight, window.innerHeight - 200);
    
    // Update game container size
    gameContainer.style.width = newWidth + 'px';
    gameContainer.style.height = newHeight + 'px';
    
    // Calculate new grid size based on width change
    var widthChangePercent = (newWidth - originalWidth) / originalWidth;
    var newGridSize = Math.round(originalGridSize + (widthChangePercent / 0.15));
    
    // Ensure grid size is within 3-8 range
    newGridSize = Math.max(newGridSize, 3);
    newGridSize = Math.min(newGridSize, 8);
    
    // Update grid size selector
    if (newGridSize !== gridSize) {
      gridSize = newGridSize;
      gridSizeInput.value = gridSize;
      gridSizeValue.textContent = gridSize + 'x' + gridSize;
    }
  });
  
  // Mouse up event
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      
      // Reset game container size
      gameContainer.style.width = '';
      gameContainer.style.height = '';
      
      // Change cursor back to default
      gameContainer.style.cursor = 'ew-resize';
      
      // Start a new game with the new grid size
      gameManager = new GameManager(gridSize, KeyboardInputManager, HTMLActuator, LocalStorageManager);
      window.gameManager = gameManager;
    }
  });
});
