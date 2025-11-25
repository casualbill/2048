function GameManager(size, InputManager, Actuator, StorageManager, canvas) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator(canvas);

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
  this.grid.eachCell(function (x, y, z, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y][tile.z] = null;
  this.grid.cells[cell.x][cell.y][cell.z] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up (Y-), 1: right (X+), 2: down (Y+), 3: left (X-), 4: forward (Z+), 5: backward (Z-)
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Determine which axes to fix based on the movement direction
  var fixedAxes = [];
  var movingAxis = '';
  
  if (vector.x !== 0) {
    movingAxis = 'x';
    fixedAxes = ['y', 'z'];
  } else if (vector.y !== 0) {
    movingAxis = 'y';
    fixedAxes = ['x', 'z'];
  } else if (vector.z !== 0) {
    movingAxis = 'z';
    fixedAxes = ['x', 'y'];
  }

  // Traverse the grid: loop through fixed axes, then process moving axis
  var loop1 = traversals[fixedAxes[0]];
  var loop2 = traversals[fixedAxes[1]];
  
  loop1.forEach(function (a) {
    loop2.forEach(function (b) {
      // Collect all tiles in the current line along the moving axis
      var line = [];
      for (var pos = 0; pos < self.size; pos++) {
        var cellPos = {};
        cellPos[fixedAxes[0]] = a;
        cellPos[fixedAxes[1]] = b;
        cellPos[movingAxis] = pos;
        tile = self.grid.cellContent(cellPos);
        if (tile) {
          line.push(tile);
        }
      }
      
      // Process the line: merge tiles and move them
      var processedLine = self.processLine(line);
      
      // Update the grid with the processed line
      for (var pos = 0; pos < self.size; pos++) {
        var cellPos = {};
        cellPos[fixedAxes[0]] = a;
        cellPos[fixedAxes[1]] = b;
        cellPos[movingAxis] = pos;
        
        // Determine the position in the traversal (could be reversed)
        var traversalPos = pos;
        if (vector[movingAxis] === 1) {
          traversalPos = self.size - 1 - pos;
        }
        
        // Update the tile in the grid
        tile = processedLine[traversalPos] || null;
        if (tile) {
          var newPos = {};
          newPos[fixedAxes[0]] = a;
          newPos[fixedAxes[1]] = b;
          newPos[movingAxis] = pos;
          self.moveTile(tile, newPos);
        } else {
          // Clear the cell if there's no tile
          self.grid.cells[cellPos.x][cellPos.y][cellPos.z] = null;
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Process a line of tiles, merging adjacent tiles with the same value
GameManager.prototype.processLine = function (line) {
  var processed = [];
  var merged = Array(line.length).fill(false);
  
  // Merge tiles from left to right
  for (var i = 0; i < line.length; i++) {
    if (merged[i]) continue;
    
    var tile = line[i];
    for (var j = i + 1; j < line.length; j++) {
      if (merged[j]) continue;
      
      if (tile.value === line[j].value) {
        // Merge the tiles
        tile.value *= 2;
        this.score += tile.value;
        if (tile.value === 2048) this.won = true;
        merged[j] = true;
        break;
      } else {
        // Can't merge with this tile, move to next
        break;
      }
    }
    
    processed.push(tile);
  }
  
  // Fill the rest with nulls
  while (processed.length < line.length) {
    processed.push(null);
  }
  
  return processed;
}

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1, z: 0 }, // Up (Y-)
    1: { x: 1,  y: 0, z: 0 },  // Right (X+)
    2: { x: 0,  y: 1, z: 0 },  // Down (Y+)
    3: { x: -1, y: 0, z: 0 },  // Left (X-)
    4: { x: 0,  y: 0, z: 1 },  // Forward (Z+)
    5: { x: 0,  y: 0, z: -1 }  // Backward (Z-)
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [], z: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
    traversals.z.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
  if (vector.z === 1) traversals.z = traversals.z.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y, z: previous.z + vector.z };
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
