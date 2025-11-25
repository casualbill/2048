// Helper function to draw rounded rectangles
CanvasActuator.prototype.drawRoundedRect = function(x, y, width, height, radius) {
  this.ctx.beginPath();
  this.ctx.moveTo(x + radius, y);
  this.ctx.arcTo(x + width, y, x + width, y + height, radius);
  this.ctx.arcTo(x + width, y + height, x, y + height, radius);
  this.ctx.arcTo(x, y + height, x, y, radius);
  this.ctx.arcTo(x, y, x + width, y, radius);
  this.ctx.closePath();
};

function CanvasActuator() {
  // Create canvas element
  this.canvas = document.createElement('canvas');
  this.ctx = this.canvas.getContext('2d');
  
  // Get the container element
  this.container = document.querySelector('.container');
  
  // Replace the container's content with canvas
  this.container.innerHTML = '';
  this.container.appendChild(this.canvas);
  
  // Set initial canvas size
  this.canvas.width = this.container.clientWidth;
  this.canvas.height = Math.max(this.container.clientHeight, 800); // Ensure enough space
  
  // Tile styles
  this.tileStyles = {
    2: { background: '#eee4da', color: '#776e65' },
    4: { background: '#ede0c8', color: '#776e65' },
    8: { background: '#f2b179', color: '#f9f6f2' },
    16: { background: '#f59563', color: '#f9f6f2' },
    32: { background: '#f67c5f', color: '#f9f6f2' },
    64: { background: '#f65e3b', color: '#f9f6f2' },
    128: { background: '#edcf72', color: '#f9f6f2' },
    256: { background: '#edcc61', color: '#f9f6f2' },
    512: { background: '#edc850', color: '#f9f6f2' },
    1024: { background: '#edc53f', color: '#f9f6f2' },
    2048: { background: '#edc22e', color: '#f9f6f2' },
    'super': { background: '#3c3a32', color: '#f9f6f2' }
  };
  
  // Game state
  this.score = 0;
  this.bestScore = 0;
  this.gameMessage = null;
  
  // Handle responsive resizing
  window.addEventListener('resize', () => this.handleResize());
  
  // Initialize animations
  this.animations = [];
  
  // Bind events for buttons
  this.canvas.addEventListener('click', (e) => this.handleClick(e));
  
  // Event listeners
  this.listeners = {};
  
  // Setup touch support
  this.setupTouchSupport();
}

// Event emitting system
CanvasActuator.prototype.on = function(event, callback) {
  if (!this.listeners[event]) {
    this.listeners[event] = [];
  }
  this.listeners[event].push(callback);
};

CanvasActuator.prototype.emit = function(event, data) {
  var listeners = this.listeners[event];
  if (listeners) {
    listeners.forEach(function(callback) {
      callback(data);
    });
  }
};

// Implement touch support for mobile devices
CanvasActuator.prototype.setupTouchSupport = function() {
  this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
  this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
  this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  
  this.touchStartX = null;
  this.touchStartY = null;
};

CanvasActuator.prototype.handleTouchStart = function(e) {
  var touch = e.touches[0];
  this.touchStartX = touch.clientX;
  this.touchStartY = touch.clientY;
};

CanvasActuator.prototype.handleTouchMove = function(e) {
  e.preventDefault();
};

CanvasActuator.prototype.handleTouchEnd = function(e) {
  if (!this.touchStartX || !this.touchStartY) {
    return;
  }
  
  var touch = e.changedTouches[0];
  var touchEndX = touch.clientX;
  var touchEndY = touch.clientY;
  
  var dx = touchEndX - this.touchStartX;
  var dy = touchEndY - this.touchStartY;
  
  // Determine swipe direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe
    this.emit('move', dx > 0 ? 1 : 3); // 1 for right, 3 for left
  } else {
    // Vertical swipe
    this.emit('move', dy > 0 ? 2 : 0); // 2 for down, 0 for up
  }
  
  this.touchStartX = null;
  this.touchStartY = null;
};



CanvasActuator.prototype.handleResize = function() {
  this.canvas.width = this.container.clientWidth;
  this.canvas.height = Math.max(this.container.clientHeight, 800);
  this.actuate(this.lastGrid, this.lastMetadata);
};

CanvasActuator.prototype.actuate = function(grid, metadata) {
  this.lastGrid = grid;
  this.lastMetadata = metadata;
  this.score = metadata.score;
  this.bestScore = metadata.bestScore;
  this.gameMessage = metadata.terminated ? (metadata.over ? 'Game over!' : 'You win!') : null;
  
  var self = this;
  
  window.requestAnimationFrame(function() {
    // Clear canvas
    self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
    
    // Draw header
    self.drawHeader();
    
    // Draw above game
    self.drawAboveGame();
    
    // Draw game container
    self.drawGameContainer();
    
    // Draw grid
    self.drawGrid();
    
    // Draw tiles
    self.drawTiles(grid);
    
    // Draw game message
    if (self.gameMessage) {
      self.drawGameMessage();
    }
    
    // Draw instruction text
    self.drawInstructions();
  });
};

CanvasActuator.prototype.handleClick = function(e) {
  var rect = this.canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;
  
  // Check if click is on New Game button
  if (this.restartButton && 
      x >= this.restartButton.x && 
      x <= this.restartButton.x + this.restartButton.width && 
      y >= this.restartButton.y && 
      y <= this.restartButton.y + this.restartButton.height) {
    // Emit restart event
    this.emit('restart');
  }
  
  // Check if click is on Keep Playing button
  if (this.keepPlayingButtonRect && 
      x >= this.keepPlayingButtonRect.x && 
      x <= this.keepPlayingButtonRect.x + this.keepPlayingButtonRect.width && 
      y >= this.keepPlayingButtonRect.y && 
      y <= this.keepPlayingButtonRect.y + this.keepPlayingButtonRect.height) {
    // Emit keep playing event
    this.emit('keepPlaying');
  }
};

CanvasActuator.prototype.drawHeader = function() {
  // Draw title
  this.ctx.fillStyle = '#776e65';
  this.ctx.font = 'bold 80px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'left';
  this.ctx.textBaseline = 'top';
  this.ctx.fillText('2048', 0, 0);
  
  // Draw score containers
  var scoreWidth = 100;
  var scoreHeight = 50;
  var margin = 10;
  
  // Draw score container
  this.ctx.fillStyle = '#bbada0';
  this.drawRoundedRect(this.canvas.width - scoreWidth * 2 - margin, 10, scoreWidth, scoreHeight, 3);
  this.ctx.fill();
  
  // Best container
  this.ctx.fillStyle = '#bbada0';
  this.drawRoundedRect(this.canvas.width - scoreWidth, 10, scoreWidth, scoreHeight, 3);
  this.ctx.fill();
  
  // Draw score labels
  this.ctx.fillStyle = '#eee4da';
  this.ctx.font = '13px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.fillText('Score', this.canvas.width - scoreWidth * 2 - margin + scoreWidth / 2, 15);
  this.ctx.fillText('Best', this.canvas.width - scoreWidth + scoreWidth / 2, 15);
  
  // Draw score values
  this.ctx.fillStyle = 'white';
  this.ctx.font = 'bold 25px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.fillText(this.score, this.canvas.width - scoreWidth * 2 - margin + scoreWidth / 2, 40);
  this.ctx.fillText(this.bestScore, this.canvas.width - scoreWidth + scoreWidth / 2, 40);
};

CanvasActuator.prototype.drawAboveGame = function() {
  // Draw game intro
  this.ctx.fillStyle = '#776e65';
  this.ctx.font = '18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'left';
  this.ctx.fillText('Join the numbers and get to the ', 0, 80);
  this.ctx.font = 'bold 18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.fillText('2048 tile!', 250, 80);
  
  // Draw restart button
  var buttonWidth = 100;
  var buttonHeight = 30;
  var margin = 10;
// Draw restart button
  this.ctx.fillStyle = '#8f7a66';
  this.drawRoundedRect(this.canvas.width - buttonWidth - margin, 80, buttonWidth, buttonHeight, 3);
  this.ctx.fill();
  
  this.ctx.fillStyle = '#f9f6f2';
  this.ctx.font = '18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'middle';
  this.ctx.fillText('New Game', this.canvas.width - buttonWidth - margin + buttonWidth / 2, 80 + buttonHeight / 2);
  
  // Store button position for click handling
  this.restartButton = {
    x: this.canvas.width - buttonWidth - margin,
    y: 80,
    width: buttonWidth,
    height: buttonHeight
  };
};

CanvasActuator.prototype.drawGameContainer = function() {
  // Draw game container background
  this.ctx.fillStyle = '#bbada0';
  this.drawRoundedRect(0, 140, this.canvas.width, this.canvas.width, 6);
  this.ctx.fill();
};

CanvasActuator.prototype.drawGrid = function() {
  var cellSize = (this.canvas.width - 15 * 5) / 4; // 15px margins between cells, 5 margins total
  var margin = 15;
  
  // Draw cells
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      this.ctx.fillStyle = 'rgba(238, 228, 218, 0.35)';
      this.drawRoundedRect(
        margin + x * (cellSize + margin),
        140 + margin + y * (cellSize + margin),
        cellSize,
        cellSize,
        3
      );
      this.ctx.fill();
      this.ctx.closePath();
    }
  }
}

CanvasActuator.prototype.drawTiles = function(grid) {
  var self = this;
  var cellSize = (this.canvas.width - 15 * 5) / 4;
  var margin = 15;
  
  grid.cells.forEach(function(column) {
    column.forEach(function(cell) {
      if (cell) {
        self.drawTile(cell, cellSize, margin);
      }
    });
  });
};

CanvasActuator.prototype.drawTile = function(tile, cellSize, margin) {
  var value = tile.value;
  var style = this.tileStyles[value] || this.tileStyles.super;
  
  // Calculate position
  var x = margin + tile.x * (cellSize + margin);
  var y = 140 + margin + tile.y * (cellSize + margin);
  
  // Draw tile background
  this.ctx.fillStyle = style.background;
  this.drawRoundedRect(x, y, cellSize, cellSize, 3);
  this.ctx.fill();
  
  // Draw tile value
  this.ctx.fillStyle = style.color;
  this.ctx.font = 'bold ' + (cellSize / 2.5) + 'px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'middle';
  this.ctx.fillText(value, x + cellSize / 2, y + cellSize / 2);
};

CanvasActuator.prototype.drawGameMessage = function() {
  // Draw message overlay
  this.ctx.fillStyle = 'rgba(238, 228, 218, 0.73)';
  this.ctx.fillRect(0, 140, this.canvas.width, this.canvas.width);
  
  // Draw message box
  var boxWidth = 260;
  var boxHeight = 140;
  var boxX = (this.canvas.width - boxWidth) / 2;
  var boxY = (this.canvas.width - boxHeight) / 2 + 140;// Draw message box
  this.ctx.fillStyle = '#f9f6f2';
  this.drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 6);
  this.ctx.fill();
  
  // Draw message text
  this.ctx.fillStyle = '#776e65';
  this.ctx.font = 'bold 40px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'middle';
  this.ctx.fillText(this.gameMessage, this.canvas.width / 2, boxY + boxHeight / 2 - 20);
  
  // Draw Keep Playing button if won
  if (this.gameMessage === 'You win!') {
    var buttonWidth = 180;
    var buttonHeight = 40;
    var buttonX = (this.canvas.width - buttonWidth) / 2;
    var buttonY = boxY + boxHeight / 2 + 20;
    
    this.ctx.fillStyle = '#8f7a66';
      this.drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3);
      this.ctx.fill();
    
    this.ctx.fillStyle = '#f9f6f2';
    this.ctx.font = '18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Keep Playing', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    
    // Store button position for click handling
    this.keepPlayingButtonRect = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    };
  } else {
    this.keepPlayingButtonRect = null;
  }
};

CanvasActuator.prototype.continueGame = function() {
  this.gameMessage = null;
  this.keepPlayingButtonRect = null;
  this.actuate(this.lastGrid, this.lastMetadata);
};

CanvasActuator.prototype.updateScore = function(score) {
  this.score = score;
  this.actuate(this.lastGrid, this.lastMetadata);
};

CanvasActuator.prototype.updateBestScore = function(bestScore) {
  this.bestScore = bestScore;
  this.actuate(this.lastGrid, this.lastMetadata);
};

CanvasActuator.prototype.message = function(won) {
  this.gameMessage = won ? 'You win!' : 'Game over!';
  this.actuate(this.lastGrid, this.lastMetadata);
};

CanvasActuator.prototype.clearMessage = function() {
  this.gameMessage = null;
  this.keepPlayingButtonRect = null;
  this.actuate(this.lastGrid, this.lastMetadata);
};

CanvasActuator.prototype.drawInstructions = function() {
  // Draw instruction text
  var instructions = [
    'How to play: Use your arrow keys to move the tiles.',
    'When two tiles with the same number touch, they merge into one!',
    'Get to the 2048 tile!' 
  ];
  
  this.ctx.fillStyle = '#776e65';
  this.ctx.font = '14px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'top';
  
  var y = this.canvas.width + 150; // Position below game board
  for (var i = 0; i < instructions.length; i++) {
    this.ctx.fillText(instructions[i], this.canvas.width / 2, y);
    y += 20; // Line height
  }
};

// Export for browser compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasActuator;
}