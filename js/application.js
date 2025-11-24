// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  const slider = document.getElementById('board-size');
  const valueDisplay = document.getElementById('board-size-value');
  const gameContainer = document.querySelector('.game-container');
  let gameManager;
  let isDragging = false;
  let originalSize = { width: 500, height: 500 };
  let originalMousePos = { x: 0, y: 0 };
  let originalBoardSize = 4;

  function startGame(size) { console.log('Starting game with size:', size);
    if (gameManager) {
      gameManager.inputManager.removeListeners();
    }
    // Clear previous game state to ensure new size is used
    const storageManager = new LocalStorageManager();
    storageManager.clearGameState();
    gameManager = new GameManager(size, KeyboardInputManager, HTMLActuator, LocalStorageManager);
    valueDisplay.textContent = `${size}x${size}`;
  }

  // Initialize with default size 4
  startGame(4);

  // Listen for slider changes
  slider.addEventListener('input', function() {
  console.log('Slider value:', this.value);
  const size = parseInt(this.value);
  startGame(size);
});

  // Mouse drag functionality to change board size
  gameContainer.addEventListener('mousemove', function(e) {
    const rect = gameContainer.getBoundingClientRect();
    const edgeSize = 20; // 20px from edge

    let cursor = 'default';
    if (
      e.clientX >= rect.left - edgeSize &&
      e.clientX <= rect.left + edgeSize &&
      e.clientY >= rect.top - edgeSize &&
      e.clientY <= rect.top + edgeSize
    ) {
      cursor = 'nwse-resize';
    } else if (
      e.clientX >= rect.right - edgeSize &&
      e.clientX <= rect.right + edgeSize &&
      e.clientY >= rect.top - edgeSize &&
      e.clientY <= rect.top + edgeSize
    ) {
      cursor = 'nesw-resize';
    } else if (
      e.clientX >= rect.left - edgeSize &&
      e.clientX <= rect.left + edgeSize &&
      e.clientY >= rect.bottom - edgeSize &&
      e.clientY <= rect.bottom + edgeSize
    ) {
      cursor = 'nesw-resize';
    } else if (
      e.clientX >= rect.right - edgeSize &&
      e.clientX <= rect.right + edgeSize &&
      e.clientY >= rect.bottom - edgeSize &&
      e.clientY <= rect.bottom + edgeSize
    ) {
      cursor = 'nwse-resize';
    } else if (
      e.clientX >= rect.left - edgeSize &&
      e.clientX <= rect.left + edgeSize
    ) {
      cursor = 'ew-resize';
    } else if (
      e.clientX >= rect.right - edgeSize &&
      e.clientX <= rect.right + edgeSize
    ) {
      cursor = 'ew-resize';
    } else if (
      e.clientY >= rect.top - edgeSize &&
      e.clientY <= rect.top + edgeSize
    ) {
      cursor = 'ns-resize';
    } else if (
      e.clientY >= rect.bottom - edgeSize &&
      e.clientY <= rect.bottom + edgeSize
    ) {
      cursor = 'ns-resize';
    }

    gameContainer.style.cursor = cursor;
  });

  gameContainer.addEventListener('mousedown', function(e) {
    const rect = gameContainer.getBoundingClientRect();
    const edgeSize = 20;

    // Check if mouse is near any edge
    const isNearEdge = (
      e.clientX <= rect.left + edgeSize ||
      e.clientX >= rect.right - edgeSize ||
      e.clientY <= rect.top + edgeSize ||
      e.clientY >= rect.bottom - edgeSize
    );

    if (isNearEdge) {
      isDragging = true;
      originalSize = { width: rect.width, height: rect.height };
      originalMousePos = { x: e.clientX, y: e.clientY };
      originalBoardSize = parseInt(slider.value);

      // Prevent text selection during drag
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (isDragging) {
      // Calculate new size based on mouse movement
      const dx = e.clientX - originalMousePos.x;
      const dy = e.clientY - originalMousePos.y;

      let newWidth = originalSize.width + dx * 2; // Multiply by 2 to make it more responsive
      let newHeight = originalSize.height + dy * 2;

      // Min size 300px, max size is browser window size
      const minSize = 300;
      const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 200); // Subtract some padding

      newWidth = Math.max(minSize, Math.min(newWidth, maxSize));
      newHeight = Math.max(minSize, Math.min(newHeight, maxSize));

      // Update game container size
      gameContainer.style.width = `${newWidth}px`;
      gameContainer.style.height = `${newHeight}px`;

      // Calculate percentage change in size
      const widthChange = (newWidth - originalSize.width) / originalSize.width;
      const heightChange = (newHeight - originalSize.height) / originalSize.height;
      const sizeChange = (widthChange + heightChange) / 2;

      // Calculate new board size
      let newBoardSize = originalBoardSize;
      if (sizeChange >= 0.15) {
        newBoardSize = originalBoardSize + Math.floor(sizeChange / 0.15);
      } else if (sizeChange <= -0.15) {
        newBoardSize = originalBoardSize + Math.ceil(sizeChange / 0.15);
      }

      // Clamp board size between 3 and 8
      newBoardSize = Math.max(3, Math.min(newBoardSize, 8));

      // Update slider value and display
      slider.value = newBoardSize;
      valueDisplay.textContent = `${newBoardSize}x${newBoardSize}`;
    }
  });

  document.addEventListener('mouseup', function(e) {
    if (isDragging) {
      isDragging = false;
      // Reset game container size
      gameContainer.style.width = `${originalSize.width}px`;
      gameContainer.style.height = `${originalSize.height}px`;
      // Start new game with new board size
      const newBoardSize = parseInt(slider.value);
      if (newBoardSize !== originalBoardSize) {
        startGame(newBoardSize);
      }
    }
  });
});
