function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
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
  // Clear any existing intervals
  if (this.countdownInterval) {
    clearInterval(this.countdownInterval);
  }
  if (this.bombInterval) {
    clearInterval(this.bombInterval);
  }
  
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Initialize countdown timer variables
  this.countdownActive = false;
  this.countdownTime = 5;
  this.countdownInterval = null;
  this.lastMergeTime = Date.now();

  // Initialize bomb variables
  this.bombCount = 0;
  this.bombInterval = null;
  this.lastBombTime = Date.now();

  // Update the actuator
  this.actuate();

  // Start the bomb generation interval
  var self = this;
  this.bombInterval = setInterval(function() {
    // Generate a bomb every 10 seconds
    if (Date.now() - self.lastBombTime >= 10000) {
      self.addBomb();
      self.lastBombTime = Date.now();
    }
  }, 1000);
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

// Adds a bomb in a random position
GameManager.prototype.addBomb = function () {
  if (this.bombCount >= 2 || !this.grid.cellsAvailable()) return;
  
  var self = this;
  var cell = this.grid.randomAvailableCell();
  var bombTile = new Tile(cell, 1024, true);
  
  this.grid.insertTile(bombTile);
  this.bombCount++;
  
  // Start the bomb timer
  bombTile.bombTimer = setInterval(function() {
    // Decrease bomb value by half every 5 seconds
    bombTile.value /= 2;
    
    // Check if bomb is about to explode
    if (bombTile.value <= 2) {
      clearInterval(bombTile.bombTimer);
      self.explodeBomb(bombTile);
      return;
    }
    
    // Only update the bomb tile's value, not the entire board
    // To do this, we need to re-render just the bomb tile
    self.actuate(); // Update the UI (this is still necessary to show the bomb value change)
  }, 5000);
};

// Handles bomb explosion
GameManager.prototype.explodeBomb = function (bombTile) {
  // Remove the bomb from the grid
  this.grid.removeTile(bombTile);
  this.bombCount--;
  
  // Split all tiles with value >= 4 into two tiles with half the value
  var self = this;
  var newTiles = [];
  
  this.grid.eachCell(function(x, y, tile) {
    if (tile && tile.value >= 4 && !tile.isBomb) {
      // Remove the original tile
      self.grid.removeTile(tile);
      
      // Create two new tiles with half the value
      var halfValue = tile.value / 2;
      var positions = self.grid.getAdjacentEmptyCells(tile.x, tile.y);
      
      // Place the first tile in the original position
      var firstTile = new Tile({x: tile.x, y: tile.y}, halfValue);
      newTiles.push(firstTile);
      
      // Place the second tile in an adjacent empty cell if available
      if (positions.length > 0) {
        var randomPosition = positions[Math.floor(Math.random() * positions.length)];
        var secondTile = new Tile(randomPosition, halfValue);
        newTiles.push(secondTile);
      }
    }
  });
  
  // Insert all new tiles into the grid
  newTiles.forEach(function(tile) {
    self.grid.insertTile(tile);
  });
  
  // Update the UI
  this.actuate();
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
    countdownActive: this.countdownActive,
    countdownTime: this.countdownTime
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
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

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var merged     = false;

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
        if (next && !tile.isBomb && !next.isBomb && next.value === tile.value && !next.mergedFrom) {
          var mergedTile = new Tile(positions.next, tile.value * 2);
          mergedTile.mergedFrom = [tile, next];

          self.grid.insertTile(mergedTile);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += mergedTile.value;

          // The mighty 2048 tile
          if (mergedTile.value === 2048) self.won = true;
          merged = true;
        } else if (next && tile.isBomb && next.value === tile.value) {
          // Player used a tile to defuse the bomb
          self.defuseBomb(tile);
          self.grid.removeTile(tile);
          self.grid.removeTile(next);
          self.bombCount--;
          merged = true;
        } else if (next && next.isBomb && tile.value === next.value) {
          // Player used a tile to defuse the bomb
          self.defuseBomb(next);
          self.grid.removeTile(tile);
          self.grid.removeTile(next);
          self.bombCount--;
          merged = true;
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
    // Start countdown timer with 20% probability if merged
    if (merged) {
      if (Math.random() < 0.2) {
        this.startCountdown();
      } else {
        this.resetCountdown();
      }
    }

    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Starts the countdown timer
GameManager.prototype.startCountdown = function () {
  var self = this;
  
  if (this.countdownInterval) {
    clearInterval(this.countdownInterval);
  }
  
  this.countdownActive = true;
  this.countdownTime = 5;
  this.actuator.updateCountdown(this.countdownActive, this.countdownTime);
  
  this.countdownInterval = setInterval(function() {
    self.countdownTime--;
    
    if (self.countdownTime <= 0) {
      clearInterval(self.countdownInterval);
      self.splitAllTiles();
      self.countdownActive = false;
    }
    
    // Only update the countdown text, not the entire board
    self.actuator.updateCountdown(self.countdownActive, self.countdownTime);
  }, 1000);
};

// Resets the countdown timer
GameManager.prototype.resetCountdown = function () {
  if (this.countdownInterval) {
    clearInterval(this.countdownInterval);
  }
  
  this.countdownActive = false;
  this.countdownTime = 5;
  this.actuate();
};

// Splits all tiles with value >= 4 into two tiles with half the value
GameManager.prototype.splitAllTiles = function () {
  var self = this;
  var newTiles = [];
  
  this.grid.eachCell(function(x, y, tile) {
    if (tile && tile.value >= 4 && !tile.isBomb) {
      // Remove the original tile
      self.grid.removeTile(tile);
      
      // Create two new tiles with half the value
      var halfValue = tile.value / 2;
      var positions = self.grid.getAdjacentEmptyCells(tile.x, tile.y);
      
      // Place the first tile in the original position
      var firstTile = new Tile({x: tile.x, y: tile.y}, halfValue);
      newTiles.push(firstTile);
      
      // Place the second tile in an adjacent empty cell if available
      if (positions.length > 0) {
        var randomPosition = positions[Math.floor(Math.random() * positions.length)];
        var secondTile = new Tile(randomPosition, halfValue);
        newTiles.push(secondTile);
      }
    }
  });
  
  // Insert all new tiles into the grid
  newTiles.forEach(function(tile) {
    self.grid.insertTile(tile);
  });
  
  // Update the UI
  this.actuate();
};

// Defuses a bomb and gives the player points
GameManager.prototype.defuseBomb = function (bombTile) {
  clearInterval(bombTile.bombTimer);
  this.score += bombTile.value * 2;
  this.actuate();
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
