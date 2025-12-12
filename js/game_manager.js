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
  this.stopChangingTileUpdates();
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

  // Stop any existing interval before starting a new game
  this.stopChangingTileUpdates();

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

  // Start the changing tile updates
  this.startChangingTileUpdates();

  // Update the actuator
  this.actuate();
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

// Adds a changing tile in a random position
GameManager.prototype.addChangingTile = function () {
  if (this.grid.cellsAvailable() && this.getChangingTileCount() < 3) {
    var value = Math.floor(Math.random() * 10) + 1;
    var tile = new Tile(this.grid.randomAvailableCell(), value, true);

    this.grid.insertTile(tile);
  }
};

// Count the number of changing tiles on the grid
GameManager.prototype.getChangingTileCount = function () {
  var count = 0;
  
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.isChanging) {
      count++;
    }
  });
  
  return count;
};

// Update the values of all changing tiles
GameManager.prototype.updateChangingTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.isChanging) {
      tile.updateValue();
    }
  });
};

// Start the changing tile update interval
GameManager.prototype.startChangingTileUpdates = function () {
  var self = this;
  this.changingTileInterval = setInterval(function () {
    self.updateChangingTiles();
    self.actuate();
  }, 500);
};

// Stop the changing tile update interval
GameManager.prototype.stopChangingTileUpdates = function () {
  if (this.changingTileInterval) {
    clearInterval(this.changingTileInterval);
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
    terminated: this.isGameTerminated()
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
        if (next && tile.canMerge(next) && !next.mergedFrom) {
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
    // 10% chance to generate a changing tile after a successful move
    if (merged && Math.random() < 0.1) {
      this.addChangingTile();
    } else {
      this.addRandomTile();
    }

    if (!this.movesAvailable() && this.isGameOver()) {
      this.over = true; // Game over!
    }

    this.actuate();
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
  // Check if there are available cells or any tiles that can be merged
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check if the game is over considering changing tiles
GameManager.prototype.isGameOver = function () {
  if (this.grid.cellsAvailable()) return false;
  
  // Check for potential merges between changing tiles
  var self = this;
  var tile;
  
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });
      
      if (tile && tile.isChanging) {
        // Check if the tile might become mergeable in the future
        var currentValue = tile.value;
        var direction = tile.direction;
        
        // Simulate a few steps to see if it could become 2, 4, or 8
        for (var i = 0; i < 5; i++) {
          currentValue += direction;
          if (currentValue <= 1 || currentValue >= 10) {
            direction *= -1;
            currentValue += direction * 2; // Compensate for overshooting
          }
          
          if (currentValue === 2 || currentValue === 4 || currentValue === 8) {
            // Check if there's a neighboring tile that could also become the same value
            for (var dir = 0; dir < 4; dir++) {
              var vector = self.getVector(dir);
              var cell = { x: x + vector.x, y: y + vector.y };
              var other = self.grid.cellContent(cell);
              
              if (other && other.isChanging) {
                var otherValue = other.value;
                var otherDirection = other.direction;
                
                // Simulate the same steps for the other tile
                var otherValues = [];
                otherValues.push(otherValue);
                for (var j = 0; j < 5; j++) {
                  otherValue += otherDirection;
                  if (otherValue <= 1 || otherValue >= 10) {
                    otherDirection *= -1;
                    otherValue += otherDirection * 2;
                  }
                  otherValues.push(otherValue);
                }
                
                // Check if there's a common value that both tiles reach
                for (var k = 0; k <= 5; k++) {
                  var val1 = k === 0 ? tile.value : currentValue + (direction * k);
                  var val2 = k === 0 ? other.value : otherValues[k];
                  
                  if (val1 === val2 && (val1 === 2 || val1 === 4 || val1 === 8)) {
                    return false; // Potential merge in the future
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return !this.tileMatchesAvailable();
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

          if (other && tile.canMerge(other)) {
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
