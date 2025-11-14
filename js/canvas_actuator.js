function CanvasActuator() {
  this.canvas = document.getElementById('gameCanvas');
  this.ctx = this.canvas.getContext('2d');
  this.score = 0;
  this.animations = [];
  
  this.setupCanvas();
  this.bindEvents();
}

CanvasActuator.prototype.setupCanvas = function() {
  this.container = document.querySelector('.container');
  this.updateScale();
  window.addEventListener('resize', this.updateScale.bind(this));
};

CanvasActuator.prototype.updateScale = function() {
  var containerWidth = this.container.offsetWidth;
  var maxCanvasWidth = 500;
  var maxCanvasHeight = 700;
  
  this.scale = Math.min(containerWidth / maxCanvasWidth, 1);
  this.canvas.width = maxCanvasWidth * this.scale;
  this.canvas.height = maxCanvasHeight * this.scale;
  
  this.ctx.scale(this.scale, this.scale);
};

CanvasActuator.prototype.bindEvents = function() {
  this.canvas.addEventListener('click', this.handleClick.bind(this));
  this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
  this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
};

CanvasActuator.prototype.handleClick = function(e) {
  var rect = this.canvas.getBoundingClientRect();
  var x = (e.clientX - rect.left) / this.scale;
  var y = (e.clientY - rect.top) / this.scale;
  this.checkButtonClick(x, y);
};

CanvasActuator.prototype.checkButtonClick = function(x, y) {
  // Check if New Game button was clicked
  if (x >= 380 && x <= 480 && y >= 100 && y <= 140) {
    this.restart();
  }
  
  // Check if Try Again button was clicked (in game over message)
  if (x >= 320 && x <= 420 && y >= 400 && y <= 440) {
    this.retry();
  }
  
  // Check if Keep Playing button was clicked (in win message)
  if (x >= 180 && x <= 280 && y >= 400 && y <= 440) {
    this.keepPlaying();
  }
};

CanvasActuator.prototype.handleTouchStart = function(e) {
  e.preventDefault();
  var rect = this.canvas.getBoundingClientRect();
  this.touchStartX = (e.touches[0].clientX - rect.left) / this.scale;
  this.touchStartY = (e.touches[0].clientY - rect.top) / this.scale;
};

CanvasActuator.prototype.handleTouchEnd = function(e) {
  e.preventDefault();
  var rect = this.canvas.getBoundingClientRect();
  var touchEndX = (e.changedTouches[0].clientX - rect.left) / this.scale;
  var touchEndY = (e.changedTouches[0].clientY - rect.top) / this.scale;
  
  var deltaX = touchEndX - this.touchStartX;
  var deltaY = touchEndY - this.touchStartY;
  
  // Check for tap (small movement)
  if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
    this.checkButtonClick(touchEndX, touchEndY);
  } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    if (deltaX > 50) {
      this.emit('move', 1); // Right
    } else if (deltaX < -50) {
      this.emit('move', 3); // Left
    }
  } else {
    // Vertical swipe
    if (deltaY > 50) {
      this.emit('move', 2); // Down
    } else if (deltaY < -50) {
      this.emit('move', 0); // Up
    }
  }
};

CanvasActuator.prototype.actuate = function(grid, metadata) {
  var self = this;
  
  window.requestAnimationFrame(function() {
    self.clearCanvas();
    self.drawBackground();
    self.drawHeading();
    self.drawScores(metadata.score, metadata.bestScore);
    self.drawGameIntro();
    self.drawRestartButton();
    self.drawGrid(grid);
    self.drawTiles(grid, metadata);
    
    if (metadata.terminated) {
      if (metadata.over) {
        self.drawMessage(false); // You lose
      } else if (metadata.won) {
        self.drawMessage(true); // You win!
      }
    }
  });
};

CanvasActuator.prototype.clearCanvas = function() {
  this.ctx.clearRect(0, 0, this.canvas.width / this.scale, this.canvas.height / this.scale);
};

CanvasActuator.prototype.drawBackground = function() {
  this.ctx.fillStyle = '#faf8ef';
  this.ctx.fillRect(0, 0, 500, 700);
};

CanvasActuator.prototype.drawHeading = function() {
  this.ctx.fillStyle = '#776e65';
  this.ctx.font = 'bold 80px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.fillText('2048', 20, 80);
};

CanvasActuator.prototype.drawScores = function(score, bestScore) {
  // Draw Score container
  this.drawScorePanel(180, 20, score, 'Score');
  
  // Draw Best container
  this.drawScorePanel(300, 20, bestScore, 'Best');
  
  // Update current score
  if (score !== this.score) {
    var difference = score - this.score;
    this.score = score;
    
    if (difference > 0) {
      this.addScoreAnimation(180, 60, '+' + difference);
    }
  }
};

CanvasActuator.prototype.drawScorePanel = function(x, y, value, label) {
  // Draw panel background
  this.ctx.fillStyle = '#bbada0';
  this.ctx.roundRect(x, y, 100, 60, 3);
  this.ctx.fill();
  
  // Draw label
  this.ctx.fillStyle = '#eee4da';
  this.ctx.font = '13px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.fillText(label, x + 50, y + 20);
  
  // Draw value
  this.ctx.fillStyle = '#ffffff';
  this.ctx.font = 'bold 25px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.fillText(value, x + 50, y + 50);
};

CanvasActuator.prototype.addScoreAnimation = function(x, y, text) {
  var animation = {
    x: x,
    y: y,
    text: text,
    opacity: 1,
    startTime: Date.now(),
    duration: 600
  };
  this.animations.push(animation);
  this.animate();
};

CanvasActuator.prototype.animate = function() {
  var now = Date.now();
  var remainingAnimations = [];
  
  this.animations.forEach(function(animation) {
    var progress = (now - animation.startTime) / animation.duration;
    if (progress < 1) {
      animation.opacity = 1 - progress;
      animation.y = animation.y - 25 * progress;
      remainingAnimations.push(animation);
    }
  });
  
  this.animations = remainingAnimations;
  
  if (this.animations.length > 0) {
    window.requestAnimationFrame(this.animate.bind(this));
  }
};

CanvasActuator.prototype.drawGameIntro = function() {
  this.ctx.fillStyle = '#776e65';
  this.ctx.font = '18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'left';
  this.ctx.fillText('Join the numbers and get to the', 20, 130);
  this.ctx.fillText('2048 tile!', 20, 155);
};

CanvasActuator.prototype.drawRestartButton = function() {
  // Draw button background
  this.ctx.fillStyle = '#8f7a66';
  this.ctx.roundRect(380, 100, 100, 40, 3);
  this.ctx.fill();
  
  // Draw button text
  this.ctx.fillStyle = '#f9f6f2';
  this.ctx.font = '18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.fillText('New Game', 430, 127);
};

CanvasActuator.prototype.drawGrid = function(grid) {
  // Draw game container background
  this.ctx.fillStyle = '#bbada0';
  this.ctx.roundRect(20, 180, 460, 460, 6);
  this.ctx.fill();
  
  // Draw grid cells
  var cellSize = 106.25;
  var gap = 15;
  
  for (var x = 0; x < grid.size; x++) {
    for (var y = 0; y < grid.size; y++) {
      var cellX = 20 + x * (cellSize + gap) + gap;
      var cellY = 180 + y * (cellSize + gap) + gap;
      
      this.ctx.fillStyle = 'rgba(238, 228, 218, 0.35)';
      this.ctx.roundRect(cellX, cellY, cellSize, cellSize, 3);
      this.ctx.fill();
    }
  }
};

CanvasActuator.prototype.drawTiles = function(grid, metadata) {
  var self = this;
  var cellSize = 106.25;
  var gap = 15;
  
  grid.cells.forEach(function(column) {
    column.forEach(function(cell) {
      if (cell) {
        var tileX = 20 + cell.x * (cellSize + gap) + gap;
        var tileY = 180 + cell.y * (cellSize + gap) + gap;
        
        // Draw tile
        self.drawTile(tileX, tileY, cellSize, cell);
      }
    });
  });
};

CanvasActuator.prototype.drawTile = function(x, y, size, tile) {
  var now = Date.now();
  var animationProgress = 0;
  
  // Handle tile appearance animation
  if (tile.previousPosition === null && !tile.mergedFrom) {
    var appearStartTime = tile.appearStartTime || (tile.appearStartTime = now);
    animationProgress = Math.min((now - appearStartTime) / 200, 1);
    var scale = 0.1 + 0.9 * animationProgress;
    
    this.drawTileWithScale(x, y, size, tile, scale);
  }
  // Handle tile merge animation
  else if (tile.mergedFrom) {
    var mergeStartTime = tile.mergeStartTime || (tile.mergeStartTime = now);
    animationProgress = Math.min((now - mergeStartTime) / 200, 1);
    var scale = 1 + 0.2 * Math.sin(animationProgress * Math.PI);
    
    this.drawTileWithScale(x, y, size, tile, scale);
    
    // Draw merged tiles
    tile.mergedFrom.forEach(function(mergedTile) {
      var mergedX = 20 + mergedTile.x * (size + 15) + 15;
      var mergedY = 180 + mergedTile.y * (size + 15) + 15;
      self.drawTile(mergedX, mergedY, size, mergedTile);
    });
  }
  // Handle tile movement animation
  else if (tile.previousPosition) {
    var moveStartTime = tile.moveStartTime || (tile.moveStartTime = now);
    animationProgress = Math.min((now - moveStartTime) / 100, 1);
    
    // Easing function: ease-out-quad
    var easedProgress = 1 - Math.pow(1 - animationProgress, 2);
    
    var previousX = 20 + tile.previousPosition.x * (size + 15) + 15;
    var previousY = 180 + tile.previousPosition.y * (size + 15) + 15;
    
    var currentX = previousX + (x - previousX) * easedProgress;
    var currentY = previousY + (y - previousY) * easedProgress;
    
    this.drawTileWithScale(currentX, currentY, size, tile, 1);
    
    if (animationProgress >= 1) {
      tile.previousPosition = null;
      tile.moveStartTime = null;
    }
  }
  // Draw static tile
  else {
    this.drawTileWithScale(x, y, size, tile, 1);
  }
};

CanvasActuator.prototype.drawTileWithScale = function(x, y, size, tile, scale) {
  var tileColors = {
    2: { bg: '#eee4da', fg: '#776e65', shadow: '0 0 30px 10px rgba(243, 215, 116, 0), inset 0 0 0 1px rgba(255, 255, 255, 0)' },
    4: { bg: '#ede0c8', fg: '#776e65', shadow: '0 0 30px 10px rgba(243, 215, 116, 0), inset 0 0 0 1px rgba(255, 255, 255, 0)' },
    8: { bg: '#f2b179', fg: '#f9f6f2', shadow: 'none' },
    16: { bg: '#f59563', fg: '#f9f6f2', shadow: 'none' },
    32: { bg: '#f67c5f', fg: '#f9f6f2', shadow: 'none' },
    64: { bg: '#f65e3b', fg: '#f9f6f2', shadow: 'none' },
    128: { bg: '#edcf72', fg: '#f9f6f2', shadow: '0 0 30px 10px rgba(243, 215, 116, 0.2381), inset 0 0 0 1px rgba(255, 255, 255, 0.14286)' },
    256: { bg: '#edcc61', fg: '#f9f6f2', shadow: '0 0 30px 10px rgba(243, 215, 116, 0.31746), inset 0 0 0 1px rgba(255, 255, 255, 0.19048)' },
    512: { bg: '#edc850', fg: '#f9f6f2', shadow: '0 0 30px 10px rgba(243, 215, 116, 0.39683), inset 0 0 0 1px rgba(255, 255, 255, 0.2381)' },
    1024: { bg: '#edc53f', fg: '#f9f6f2', shadow: '0 0 30px 10px rgba(243, 215, 116, 0.47619), inset 0 0 0 1px rgba(255, 255, 255, 0.28571)' },
    2048: { bg: '#edc22e', fg: '#f9f6f2', shadow: '0 0 30px 10px rgba(243, 215, 116, 0.55556), inset 0 0 0 1px rgba(255, 255, 255, 0.33333)' }
  };
  
  var color = tileColors[tile.value] || { bg: '#3c3a32', fg: '#f9f6f2', shadow: 'none' };
  
  // Save context state
  this.ctx.save();
  
  // Translate to center of tile
  this.ctx.translate(x + size / 2, y + size / 2);
  
  // Scale
  this.ctx.scale(scale, scale);
  
  // Translate back
  this.ctx.translate(-(x + size / 2), -(y + size / 2));
  
  // Draw tile background
  this.ctx.fillStyle = color.bg;
  this.ctx.roundRect(x, y, size, size, 3);
  this.ctx.fill();
  
  // Draw shadow if needed
  if (color.shadow !== 'none') {
    this.ctx.shadowColor = color.shadow.split(' ')[0] + ' ' + color.shadow.split(' ')[1] + ' ' + color.shadow.split(' ')[2] + ' ' + color.shadow.split(' ')[3];
    this.ctx.shadowBlur = parseInt(color.shadow.split(' ')[2]);
  }
  
  // Draw tile value
  var fontSize = 55;
  if (tile.value >= 128 && tile.value <= 512) fontSize = 45;
  if (tile.value >= 1024) fontSize = 35;
  if (tile.value > 2048) fontSize = 30;
  
  this.ctx.fillStyle = color.fg;
  this.ctx.font = 'bold ' + fontSize + 'px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'middle';
  this.ctx.fillText(tile.value, x + size / 2, y + size / 2);
  
  // Restore context state
  this.ctx.restore();
};

CanvasActuator.prototype.drawMessage = function(won) {
  // Draw semi-transparent background
  var bgColor = won ? 'rgba(237, 194, 46, 0.5)' : 'rgba(238, 228, 218, 0.5)';
  this.ctx.fillStyle = bgColor;
  this.ctx.fillRect(20, 180, 460, 460);
  
  // Draw message text
  var textColor = won ? '#f9f6f2' : '#776e65';
  this.ctx.fillStyle = textColor;
  this.ctx.font = 'bold 60px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.fillText(won ? 'You win!' : 'Game over!', 250, 350);
  
  // Draw buttons
  if (won) {
    // Keep Playing button
    this.drawButton(180, 400, 100, 40, '#8f7a66', '#f9f6f2', 'Keep going');
  }
  
  // Try Again button
  this.drawButton(320, 400, 100, 40, '#8f7a66', '#f9f6f2', 'Try again');
};

CanvasActuator.prototype.drawButton = function(x, y, width, height, bgColor, fgColor, text) {
  this.ctx.fillStyle = bgColor;
  this.ctx.roundRect(x, y, width, height, 3);
  this.ctx.fill();
  
  this.ctx.fillStyle = fgColor;
  this.ctx.font = '18px "Clear Sans", "Helvetica Neue", Arial, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'middle';
  this.ctx.fillText(text, x + width / 2, y + height / 2);
};

CanvasActuator.prototype.continueGame = function() {
  // Clear any game messages
  this.clearCanvas();
};

CanvasActuator.prototype.restart = function() {
  this.emit('restart');
};

CanvasActuator.prototype.keepPlaying = function() {
  this.emit('keepPlaying');
};

CanvasActuator.prototype.retry = function() {
  this.emit('restart');
};

// Event emitter implementation
CanvasActuator.prototype.on = function(event, callback) {
  if (!this.eventListeners) {
    this.eventListeners = {};
  }
  if (!this.eventListeners[event]) {
    this.eventListeners[event] = [];
  }
  this.eventListeners[event].push(callback);
};

CanvasActuator.prototype.emit = function(event, data) {
  if (this.eventListeners && this.eventListeners[event]) {
    this.eventListeners[event].forEach(function(callback) {
      callback(data);
    });
  }
};

// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
  };
}