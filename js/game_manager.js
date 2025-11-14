function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.powerUps       = {};
  this.powerUpMode    = null; // 当前道具使用模式
  this.powerUpData    = {};   // 道具使用过程中的临时数据
  this.history        = [];    // 用于回退道具的历史记录
  this.timerBombs     = [];    // 定时炸弹列表

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
  this.setupPowerUps();
  this.bindPowerUpEvents();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.powerUps    = previousState.powerUps || this.initializePowerUps();
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.powerUps    = this.initializePowerUps();

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Initialize power-ups with random counts
GameManager.prototype.initializePowerUps = function() {
  return {
    "定时炸弹": Math.floor(Math.random() * 2) + 1,
    "随机炸弹": Math.floor(Math.random() * 2) + 1,
    "同数消除": Math.floor(Math.random() * 2) + 1,
    "旋转": Math.floor(Math.random() * 2) + 1,
    "交换": Math.floor(Math.random() * 2) + 1,
    "回退": Math.floor(Math.random() * 2) + 1
  };
};

// Set up power-ups
GameManager.prototype.setupPowerUps = function() {
  // Initialize power-up counts
  this.powerUps = this.initializePowerUps();
};

// Bind power-up click events
GameManager.prototype.bindPowerUpEvents = function() {
  var self = this;
  var powerUpElements = document.querySelectorAll('.power-up');
  
  Array.prototype.forEach.call(powerUpElements, function(element) {
    element.addEventListener('click', function() {
      var powerUpType = element.dataset.type;
      if (self.powerUps[powerUpType] > 0 && !self.isGameTerminated() && !self.powerUpMode) {
        self.usePowerUp(powerUpType);
      }
    });
  });
};

// Use a power-up
GameManager.prototype.usePowerUp = function(type) {
  if (this.powerUps[type] <= 0) return;
  
  switch(type) {
    case '定时炸弹':
      this.enterPowerUpMode('定时炸弹');
      break;
    case '随机炸弹':
      this.useRandomBomb();
      break;
    case '同数消除':
      this.enterPowerUpMode('同数消除');
      break;
    case '旋转':
      this.useRotate();
      break;
    case '交换':
      this.enterPowerUpMode('交换');
      break;
    case '回退':
      this.useUndo();
      break;
  }
};

// Enter power-up selection mode
GameManager.prototype.enterPowerUpMode = function(type) {
  this.powerUpMode = type;
  this.powerUpData = {};
  
  // Add selection listeners to grid cells
  var self = this;
  var gridCells = document.querySelectorAll('.grid-cell');
  
  Array.prototype.forEach.call(gridCells, function(cell) {
    cell.addEventListener('click', self.handleCellClick.bind(self));
    if (type === '定时炸弹' || type === '同数消除') {
      cell.classList.add(type === '定时炸弹' ? 'selected-red' : 'selected-blue');
    }
  });
};

// Handle cell click in power-up mode
GameManager.prototype.handleCellClick = function(event) {
  var cell = event.target;
  var x = parseInt(cell.dataset.x);
  var y = parseInt(cell.dataset.y);
  
  if (!this.grid.withinBounds({x: x, y: y})) return;
  
  switch(this.powerUpMode) {
    case '定时炸弹':
      this.selectTimerBombTarget({x: x, y: y});
      break;
    case '同数消除':
      this.selectSameNumberTarget({x: x, y: y});
      break;
    case '交换':
      this.selectSwapTarget({x: x, y: y});
      break;
  }
};

// Exit power-up mode
GameManager.prototype.exitPowerUpMode = function() {
  // Remove selection listeners from grid cells
  var self = this;
  var gridCells = document.querySelectorAll('.grid-cell');
  
  Array.prototype.forEach.call(gridCells, function(cell) {
    cell.removeEventListener('click', self.handleCellClick.bind(self));
    cell.classList.remove('selected-red', 'selected-blue');
  });
  
  this.powerUpMode = null;
  this.powerUpData = {};
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    powerUps:   this.powerUps
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    powerUps:    this.powerUps
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated() || this.powerUpMode) return; // Don't do anything if the game's over or in power-up mode

  // Save current state to history for undo
  this.saveHistory();

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    // Update timer bombs after each move
    this.updateTimerBombs();
    
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Select target for timer bomb
GameManager.prototype.selectTimerBombTarget = function(position) {
  var tile = this.grid.cellContent(position);
  if (!tile) return;
  
  // Add timer bomb to the tile
  tile.timerBomb = 5;
  this.timerBombs.push(tile);
  
  // Decrement power-up count
  this.powerUps['定时炸弹']--;
  
  // Exit selection mode
  this.exitPowerUpMode();
  
  // Update UI
  this.actuate();
};

// Use random bomb
GameManager.prototype.useRandomBomb = function() {
  var availableTiles = [];
  this.grid.eachCell(function(x, y, tile) {
    if (tile) availableTiles.push(tile);
  });
  
  if (availableTiles.length === 0) return;
  
  // Select random tile
  var randomTile = availableTiles[Math.floor(Math.random() * availableTiles.length)];
  
  // Remove the tile
  this.grid.removeTile(randomTile);
  
  // Decrement power-up count
  this.powerUps['随机炸弹']--;
  
  // Update UI
  this.actuate();
};

// Select target for same number elimination
GameManager.prototype.selectSameNumberTarget = function(position) {
  var tile = this.grid.cellContent(position);
  if (!tile) return;
  
  var value = tile.value;
  var tilesToRemove = [];
  
  // Find all tiles with the same value
  this.grid.eachCell(function(x, y, t) {
    if (t && t.value === value) {
      tilesToRemove.push(t);
    }
  });
  
  // Remove the tiles
  tilesToRemove.forEach(function(t) {
    this.grid.removeTile(t);
  }, this);
  
  // Decrement power-up count
  this.powerUps['同数消除']--;
  
  // Exit selection mode
  this.exitPowerUpMode();
  
  // Update UI
  this.actuate();
};

// Use rotate power-up
GameManager.prototype.useRotate = function() {
  // Get the outermost tiles
  var size = this.size;
  var topRow = [];
  var rightColumn = [];
  var bottomRow = [];
  var leftColumn = [];
  
  // Collect top row (y=0)
  for (var x = 0; x < size; x++) {
    var tile = this.grid.cellContent({x: x, y: 0});
    if (tile) topRow.push(tile);
  }
  
  // Collect right column (x=size-1)
  for (var y = 1; y < size; y++) {
    var tile = this.grid.cellContent({x: size-1, y: y});
    if (tile) rightColumn.push(tile);
  }
  
  // Collect bottom row (y=size-1)
  for (var x = size-2; x >= 0; x--) {
    var tile = this.grid.cellContent({x: x, y: size-1});
    if (tile) bottomRow.push(tile);
  }
  
  // Collect left column (x=0)
  for (var y = size-2; y > 0; y--) {
    var tile = this.grid.cellContent({x: 0, y: y});
    if (tile) leftColumn.push(tile);
  }
  
  // Combine all outer tiles
  var outerTiles = topRow.concat(rightColumn, bottomRow, leftColumn);
  
  // Rotate the outer tiles
  outerTiles.unshift(outerTiles.pop());
  
  // Place the rotated tiles back
  var index = 0;
  
  // Top row
  for (var x = 0; x < size; x++) {
    if (index < outerTiles.length) {
      var tile = outerTiles[index++];
      this.moveTile(tile, {x: x, y: 0});
    }
  }
  
  // Right column
  for (var y = 1; y < size; y++) {
    if (index < outerTiles.length) {
      var tile = outerTiles[index++];
      this.moveTile(tile, {x: size-1, y: y});
    }
  }
  
  // Bottom row
  for (var x = size-2; x >= 0; x--) {
    if (index < outerTiles.length) {
      var tile = outerTiles[index++];
      this.moveTile(tile, {x: x, y: size-1});
    }
  }
  
  // Left column
  for (var y = size-2; y > 0; y--) {
    if (index < outerTiles.length) {
      var tile = outerTiles[index++];
      this.moveTile(tile, {x: 0, y: y});
    }
  }
  
  // Decrement power-up count
  this.powerUps['旋转']--;
  
  // Update UI
  this.actuate();
};

// Select swap target
GameManager.prototype.selectSwapTarget = function(position) {
  var tile = this.grid.cellContent(position);
  if (!tile) return;
  
  if (!this.powerUpData.firstTile) {
    // First tile selected
    this.powerUpData.firstTile = tile;
    // Add visual feedback (shaking)
    var tileElement = document.querySelector('.tile-position-' + (tile.x+1) + '-' + (tile.y+1));
    if (tileElement) tileElement.classList.add('shaking');
  } else {
    // Second tile selected
    var firstTile = this.powerUpData.firstTile;
    var secondTile = tile;
    
    // Swap the tiles
    this.swapTiles(firstTile, secondTile);
    
    // Remove visual feedback
    var firstTileElement = document.querySelector('.tile-position-' + (firstTile.x+1) + '-' + (firstTile.y+1));
    if (firstTileElement) firstTileElement.classList.remove('shaking');
    
    // Decrement power-up count
    this.powerUps['交换']--;
    
    // Exit selection mode
    this.exitPowerUpMode();
    
    // Update UI
    this.actuate();
  }
};

// Swap two tiles
GameManager.prototype.swapTiles = function(tile1, tile2) {
  // Swap positions in grid
  this.grid.cells[tile1.x][tile1.y] = tile2;
  this.grid.cells[tile2.x][tile2.y] = tile1;
  
  // Update tile positions
  var tempX = tile1.x;
  var tempY = tile1.y;
  tile1.updatePosition({x: tile2.x, y: tile2.y});
  tile2.updatePosition({x: tempX, y: tempY});
};

// Use undo power-up
GameManager.prototype.useUndo = function() {
  if (this.history.length === 0) return;
  
  // Get previous state
  var previousState = this.history.pop();
  
  // Restore previous state
  this.grid        = new Grid(previousState.grid.size, previousState.grid.cells);
  this.score       = previousState.score;
  this.over        = previousState.over;
  this.won         = previousState.won;
  this.keepPlaying = previousState.keepPlaying;
  
  // Decrement power-up count
  this.powerUps['回退']--;
  
  // Update UI
  this.actuate();
};

// Update timer bombs after each move
GameManager.prototype.updateTimerBombs = function() {
  var self = this;
  var bombsToRemove = [];
  
  this.timerBombs.forEach(function(tile, index) {
    // Check if tile still exists
    if (self.grid.cellContent(tile) !== tile) {
      // Tile has moved or merged, update bomb reference
      bombsToRemove.push(index);
      return;
    }
    
    // Decrement timer
    tile.timerBomb--;
    
    // Check if timer reached zero
    if (tile.timerBomb <= 0) {
      // Remove the tile
      self.grid.removeTile(tile);
      bombsToRemove.push(index);
    }
  });
  
  // Remove bombs that have exploded or moved
  for (var i = bombsToRemove.length - 1; i >= 0; i--) {
    this.timerBombs.splice(bombsToRemove[i], 1);
  }
};

// Save current state to history
GameManager.prototype.saveHistory = function() {
  this.history.push(this.serialize());
  // Limit history size
  if (this.history.length > 5) {
    this.history.shift();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
