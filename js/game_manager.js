function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator(this);

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
  this.grid.eachCell(function (q, r, s, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.removeTile(tile);
  tile.updatePosition(cell);
  this.grid.insertTile(tile);
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
  traversals.cells.forEach(function (cell) {
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

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction (axial coordinates)
GameManager.prototype.getVector = function (direction) {
  // 0: up (W), 1: up-right (E), 2: down-right (D), 3: down (S), 4: down-left (A), 5: up-left (Q)
  var map = {
    0: { q: 0,  r: -1 }, // Up
    1: { q: 1,  r: -1 }, // Up-right
    2: { q: 1,  r: 0 },  // Down-right
    3: { q: 0,  r: 1 },  // Down
    4: { q: -1, r: 1 },  // Down-left
    5: { q: -1, r: 0 }   // Up-left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order (axial coordinates)
GameManager.prototype.buildTraversals = function (vector) {
  var cells = [];
  this.grid.eachCell(function (q, r, s, tile) {
    cells.push({ q: q, r: r, s: s });
  });

  // Sort cells based on the direction vector
  if (vector.q === 0 && vector.r === -1) {
    // Up (W): sort by r ascending
    cells.sort((a, b) => a.r - b.r);
  } else if (vector.q === 1 && vector.r === -1) {
    // Up-right (E): sort by q ascending
    cells.sort((a, b) => a.q - b.q);
  } else if (vector.q === 1 && vector.r === 0) {
    // Down-right (D): sort by q ascending
    cells.sort((a, b) => a.q - b.q);
  } else if (vector.q === 0 && vector.r === 1) {
    // Down (S): sort by r descending
    cells.sort((a, b) => b.r - a.r);
  } else if (vector.q === -1 && vector.r === 1) {
    // Down-left (A): sort by q descending
    cells.sort((a, b) => b.q - a.q);
  } else if (vector.q === -1 && vector.r === 0) {
    // Up-left (Q): sort by q descending
    cells.sort((a, b) => b.q - a.q);
  }

  return { cells: cells };
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { q: previous.q + vector.q, r: previous.r + vector.r };
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

  for (var q = -this.size + 1; q < this.size; q++) {
    for (var r = -this.size + 1; r < this.size; r++) {
      var s = -q - r;
      if (Math.abs(s) < this.size) {
        tile = this.grid.cellContent({ q: q, r: r, s: s });

        if (tile) {
          for (var direction = 0; direction < 6; direction++) {
            var vector = self.getVector(direction);
            var cell   = { q: q + vector.q, r: r + vector.r };

            var other  = self.grid.cellContent(cell);

            if (other && other.value === tile.value) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.q === second.q && first.r === second.r;
};

// Expose GameManager globally
window.GameManager = GameManager;
