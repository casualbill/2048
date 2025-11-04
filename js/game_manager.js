function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("undo", this.undo.bind(this));
  this.inputManager.on("remove", this.toggleRemoveMode.bind(this));
  this.inputManager.on("swap", this.toggleSwapMode.bind(this));
  this.inputManager.on("tileClick", this.handleTileClick.bind(this));

  this.setup();
};

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Undo the last move
GameManager.prototype.undo = function () {
  if (this.undoCount <= 0 || this.history.length === 0) {
    return;
  }

  // Get the last state from history
  var lastState = this.history.pop();
  
  // Calculate the score difference
  var scoreDiff = this.score - lastState.score;
  
  // Restore the state
  this.grid = new Grid(lastState.grid.size, lastState.grid.cells);
  this.score = lastState.score;
  this.over = lastState.over;
  this.won = lastState.won;
  this.keepPlaying = lastState.keepPlaying;
  
  // Decrement undo count
  this.undoCount--;
  
  // Update the actuator with the restored state
  this.actuate();
  
  // If score decreased, show a minus animation
  if (scoreDiff > 0) {
    this.actuator.showScoreChange(-scoreDiff);
  }
};

// Toggle remove mode
GameManager.prototype.toggleRemoveMode = function () {
  if (this.removeCount <= 0) {
    return;
  }

  this.removeMode = !this.removeMode;
  this.swapMode = false; // Ensure only one mode is active at a time
  this.selectedTile = null;

  // Update the actuator with the new mode state
  this.actuate();
};

// Toggle swap mode
GameManager.prototype.toggleSwapMode = function () {
  if (this.swapCount <= 0) {
    return;
  }

  this.swapMode = !this.swapMode;
  this.removeMode = false; // Ensure only one mode is active at a time
  this.selectedTile = null;

  // Update the actuator with the new mode state
  this.actuate();
};

// Handle tile click based on current mode
GameManager.prototype.handleTileClick = function (position) {
  if (this.removeMode) {
    this.removeTile(position);
  } else if (this.swapMode) {
    this.handleSwapSelection(position);
  }
};

// Remove a tile from the grid
GameManager.prototype.removeTile = function (position) {
  if (this.removeCount <= 0) {
    return;
  }

  var tile = this.grid.cellContent(position);
  if (!tile) {
    return;
  }

  // Add fade-out class to the tile
  this.actuator.addTileClass(tile, 'fading-out');

  // Remove the tile after the animation completes
  var self = this;
  setTimeout(function() {
    self.grid.removeTile(tile);
    self.removeCount--;
    self.removeMode = false;
    self.actuate();
  }, 500);
};

// Handle tile selection for swapping
GameManager.prototype.handleSwapSelection = function (position) {
  if (this.swapCount <= 0) {
    return;
  }

  var tile = this.grid.cellContent(position);
  if (!tile) {
    return;
  }

  if (!this.selectedTile) {
    // First tile selected
    this.selectedTile = tile;
    this.actuator.addTileClass(tile, 'shaking');
    this.actuate();
  } else if (this.selectedTile === tile) {
    // Deselect the tile if clicked again
    this.actuator.removeTileClass(tile, 'shaking');
    this.selectedTile = null;
    this.actuate();
  } else {
    // Second tile selected, perform swap
    this.swapTiles(this.selectedTile, tile);
  }
};

// Swap two tiles on the grid
GameManager.prototype.swapTiles = function (tile1, tile2) {
  // Save positions for animation
  var position1 = { x: tile1.x, y: tile1.y };
  var position2 = { x: tile2.x, y: tile2.y };

  // Update tile positions
  this.grid.cells[tile1.x][tile1.y] = tile2;
  this.grid.cells[tile2.x][tile2.y] = tile1;
  
  tile1.updatePosition(position2);
  tile2.updatePosition(position1);

  // Add moving class to both tiles
  this.actuator.addTileClass(tile1, 'moving');
  this.actuator.addTileClass(tile2, 'moving');

  // Update UI after animation completes
  var self = this;
  setTimeout(function() {
    self.actuator.removeTileClass(tile1, 'shaking moving');
    self.actuator.removeTileClass(tile2, 'moving');
    self.selectedTile = null;
    self.swapCount--;
    self.swapMode = false;
    self.actuate();
  }, 300);
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

  this.undoCount = 3;
  this.removeCount = 2;
  this.swapCount = 2;
  this.history = [];
  this.removeMode = false;
  this.swapMode = false;
  this.selectedTile = null;

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

// Serialize the current game state
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    undoCount:   this.undoCount,
    removeCount: this.removeCount,
    swapCount:   this.swapCount,
    history:     this.history
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

  // Save current state to history before making any moves
  var currentState = this.serialize();

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
    // Only save to history if the move actually changed the grid
    this.history.push(currentState);
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
GameManager.prototype.buildTraversals = function(vector) {
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

// Find the farthest position a tile can move to in a direction
GameManager.prototype.findFarthestPosition = function(cell, vector) {
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

// Check for available moves
GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available tile matches
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
