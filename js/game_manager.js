function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.mode           = 'classic'; // 'classic' or 'maze'
  this.walls          = []; // Array to store walls

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("modeChange", this.changeMode.bind(this));

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

// Change game mode
GameManager.prototype.changeMode = function (mode) {
  this.mode = mode;
  this.restart(); // Restart game when changing mode
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
    this.mode        = previousState.mode || 'classic';
    this.walls       = previousState.walls || [];
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.walls       = [];

    // Generate walls if in maze mode
    if (this.mode === 'maze') {
      this.generateWalls();
    }

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Generate random walls for maze mode
GameManager.prototype.generateWalls = function () {
  this.walls = [];
  var wallCount = Math.floor(Math.random() * 2) + 2; // 2-3 walls

  for (var i = 0; i < wallCount; i++) {
    var isHorizontal = Math.random() < 0.5;
    var length = Math.floor(Math.random() * 3) + 1; // 1-3 cells long
    var x, y;

    if (isHorizontal) {
      // Horizontal wall: between rows y and y+1, columns x to x+length
      y = Math.floor(Math.random() * (this.size - 1));
      x = Math.floor(Math.random() * (this.size - length + 1));
    } else {
      // Vertical wall: between columns x and x+1, rows y to y+length
      x = Math.floor(Math.random() * (this.size - 1));
      y = Math.floor(Math.random() * (this.size - length + 1));
    }

    // Check if this wall overlaps with existing walls
    var overlaps = false;
    for (var j = 0; j < this.walls.length; j++) {
      var existingWall = this.walls[j];
      if (existingWall.isHorizontal === isHorizontal) {
        if (isHorizontal) {
          if (existingWall.y === y) {
            // Check x range overlap
            var existingEnd = existingWall.x + existingWall.length;
            var newEnd = x + length;
            if (x < existingEnd && newEnd > existingWall.x) {
              overlaps = true;
              break;
            }
          }
        } else {
          if (existingWall.x === x) {
            // Check y range overlap
            var existingEnd = existingWall.y + existingWall.length;
            var newEnd = y + length;
            if (y < existingEnd && newEnd > existingWall.y) {
              overlaps = true;
              break;
            }
          }
        }
      }
    }

    if (!overlaps) {
      this.walls.push({
        isHorizontal: isHorizontal,
        x: x,
        y: y,
        length: length
      });
    }
  }
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
  if (this.storageManager.getBestScore(this.mode) < this.score) {
    this.storageManager.setBestScore(this.score, this.mode);
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
    bestScore:  this.storageManager.getBestScore(this.mode),
    terminated: this.isGameTerminated(),
    mode:       this.mode,
    walls:      this.walls
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
    mode:        this.mode,
    walls:       this.walls
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
        if (next && next.value === tile.value && !next.mergedFrom && !this.isWallBetween(cell, positions.next)) {
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
    this.addRandomTile();

    if (!this.movesAvailable()) {
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
           this.grid.cellAvailable(cell) &&
           !this.isWallBetween(previous, cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

// Check if there's a wall between two adjacent cells
GameManager.prototype.isWallBetween = function (cell1, cell2) {
  if (this.mode !== 'maze') return false;

  var x1 = Math.min(cell1.x, cell2.x);
  var y1 = Math.min(cell1.y, cell2.y);
  var x2 = Math.max(cell1.x, cell2.x);
  var y2 = Math.max(cell1.y, cell2.y);

  // Check if cells are adjacent
  if ((x2 - x1) + (y2 - y1) !== 1) return false;

  var isHorizontalWall = (y2 - y1 === 1);

  for (var i = 0; i < this.walls.length; i++) {
    var wall = this.walls[i];

    if (wall.isHorizontal === isHorizontalWall) {
      if (isHorizontalWall) {
        // Horizontal wall between y and y+1
        if (wall.y === y1 && x1 >= wall.x && x1 < wall.x + wall.length) {
          return true;
        }
      } else {
        // Vertical wall between x and x+1
        if (wall.x === x1 && y1 >= wall.y && y1 < wall.y + wall.length) {
          return true;
        }
      }
    }
  }

  return false;
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

          if (other && other.value === tile.value && !this.isWallBetween({x: x, y: y}, cell)) {
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
