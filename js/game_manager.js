function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.props = {
    'bomb-timer': Math.floor(Math.random() * 2) + 1,
    'bomb-random': Math.floor(Math.random() * 2) + 1,
    'clear-same': Math.floor(Math.random() * 2) + 1,
    'rotate': Math.floor(Math.random() * 2) + 1,
    'swap': Math.floor(Math.random() * 2) + 1,
    'undo': Math.floor(Math.random() * 2) + 1
  };
  this.propUsage = {};
  this.currentProp = null;
  this.swapTiles = [];
  this.undoStack = [];
  this.blockInput = false;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("propClick", this.handlePropClick.bind(this));
  this.inputManager.on("tileClick", this.handleTileClick.bind(this));

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
  console.log('Previous state:', previousState);

  // Check if previousState is valid
  if (previousState) {
    if (!previousState.grid || typeof previousState.grid !== 'object' || !previousState.grid.size || !previousState.grid.cells) {
      previousState = null;
      this.storageManager.clearGameState();
    }
  }

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.props       = previousState.props || {
      'bomb-timer': Math.floor(Math.random() * 2) + 1,
      'bomb-random': Math.floor(Math.random() * 2) + 1,
      'clear-same': Math.floor(Math.random() * 2) + 1,
      'rotate': Math.floor(Math.random() * 2) + 1,
      'swap': Math.floor(Math.random() * 2) + 1,
      'undo': Math.floor(Math.random() * 2) + 1
    };
    this.propUsage   = previousState.propUsage || {};
    this.undoStack   = previousState.undoStack || [];
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.props       = {
      'bomb-timer': Math.floor(Math.random() * 2) + 1,
      'bomb-random': Math.floor(Math.random() * 2) + 1,
      'clear-same': Math.floor(Math.random() * 2) + 1,
      'rotate': Math.floor(Math.random() * 2) + 1,
      'swap': Math.floor(Math.random() * 2) + 1,
      'undo': Math.floor(Math.random() * 2) + 1
    };
    this.propUsage   = {};
    this.undoStack   = [];

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
    this.showPropUsage();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    props:      this.props
  });

};

// Handle prop click
GameManager.prototype.handlePropClick = function (propName) {
  if (this.isGameTerminated() || this.blockInput) return;

  if (this.props[propName] <= 0) return;

  // Reset current prop state
  this.currentProp = propName;
  this.swapTiles = [];

  // Update prop usage
  if (!this.propUsage[propName]) {
    this.propUsage[propName] = 0;
  }

  // For props that don't require tile selection
  if (propName === 'bomb-random' || propName === 'rotate' || propName === 'undo') {
    this.props[propName]--;
    this.propUsage[propName]++;
    this.blockInput = true;

    setTimeout(() => {
      this.executeProp(propName);
      this.blockInput = false;
      this.currentProp = null;
      this.actuate();
    }, 100);
  } else {
    // For props that require tile selection
    this.actuator.showPropSelection(propName);
  }
};

// Handle tile click for prop usage
GameManager.prototype.handleTileClick = function (tilePosition) {
  if (!this.currentProp || this.blockInput) return;

  const tile = this.grid.cellContent(tilePosition);
  if (!tile) return;

  switch (this.currentProp) {
    case 'bomb-timer':
      this.applyTimerBomb(tile);
      this.props[this.currentProp]--;
      this.propUsage[this.currentProp]++;
      this.currentProp = null;
      this.actuate();
      break;
    case 'clear-same':
      this.clearSameTiles(tile.value);
      this.props[this.currentProp]--;
      this.propUsage[this.currentProp]++;
      this.currentProp = null;
      this.blockInput = true;
      setTimeout(() => {
        this.blockInput = false;
        this.actuate();
      }, 1000);
      break;
    case 'swap':
      this.swapTiles.push(tilePosition);
      if (this.swapTiles.length === 2) {
        this.swapTwoTiles(this.swapTiles[0], this.swapTiles[1]);
        this.props[this.currentProp]--;
        this.propUsage[this.currentProp]++;
        this.currentProp = null;
        this.swapTiles = [];
        this.blockInput = true;
        setTimeout(() => {
          this.blockInput = false;
          this.actuate();
        }, 500);
      }
      break;
  }
};

// Execute prop that doesn't require tile selection
GameManager.prototype.executeProp = function (propName) {
  switch (propName) {
    case 'bomb-random':
      this.activateRandomBomb();
      break;
    case 'rotate':
      this.rotateOuterRing();
      break;
    case 'undo':
      this.undoLastMove();
      break;
  }
};

// Show prop usage when game ends
GameManager.prototype.showPropUsage = function () {
  let usageText = '道具使用统计：\n';
  for (const prop in this.propUsage) {
    usageText += `${prop}: ${this.propUsage[prop]}次\n`;
  }
  alert(usageText);
};

// Apply timer bomb to a tile
GameManager.prototype.applyTimerBomb = function (tile) {
  tile.timer = 5;
  this.actuator.showTimerBomb(tile);

  // Update timer after each move
  const originalMove = this.move;
  this.move = (direction) => {
    originalMove.call(this, direction);
    this.updateTimerBombs();
    this.actuate();
  };
};

// Update timer bombs after each move
GameManager.prototype.updateTimerBombs = function () {
  this.grid.eachCell((x, y, tile) => {
    if (tile && tile.timer > 0) {
      tile.timer--;
      if (tile.timer === 0) {
        this.grid.removeTile(tile);
        this.actuate();
      }
    }
  });
};

// Activate random bomb
GameManager.prototype.activateRandomBomb = function () {
  const tiles = [];
  this.grid.eachCell((x, y, tile) => {
    if (tile) tiles.push(tile);
  });

  if (tiles.length === 0) return;

  const randomTile = tiles[Math.floor(Math.random() * tiles.length)];
  this.grid.removeTile(randomTile);
};

// Clear all tiles with the same value
GameManager.prototype.clearSameTiles = function (value) {
  this.grid.eachCell((x, y, tile) => {
    if (tile && tile.value === value) {
      this.grid.removeTile(tile);
    }
  });
};

// Rotate outer ring of tiles clockwise
GameManager.prototype.rotateOuterRing = function () {
  const size = this.size;
  if (size !== 4) return;

  // Save outer ring tiles
  const topRow = [];
  const rightCol = [];
  const bottomRow = [];
  const leftCol = [];

  // Top row (excluding corners)
  for (let y = 1; y < size - 1; y++) {
    topRow.push(this.grid.cellContent({x: 0, y}));
  }

  // Right column (including corners)
  for (let x = 0; x < size; x++) {
    rightCol.push(this.grid.cellContent({x, y: size - 1}));
  }

  // Bottom row (excluding corners, reversed)
  for (let y = size - 2; y > 0; y--) {
    bottomRow.push(this.grid.cellContent({x: size - 1, y}));
  }

  // Left column (including corners)
  for (let x = size - 1; x >= 0; x--) {
    leftCol.push(this.grid.cellContent({x, y: 0}));
  }

  // Move tiles clockwise
  // Top row gets left column (excluding bottom corner)
  for (let y = 0; y < size; y++) {
    const tile = leftCol[y];
    if (tile) {
      tile.updatePosition({x: 0, y});
      this.grid.insertTile(tile);
    }
  }

  // Right column gets top row (including left corner)
  for (let x = 0; x < size; x++) {
    const tile = topRow[x];
    if (tile) {
      tile.updatePosition({x, y: size - 1});
      this.grid.insertTile(tile);
    }
  }

  // Bottom row gets right column (excluding top corner)
  for (let y = size - 1; y >= 0; y--) {
    const tile = rightCol[y];
    if (tile) {
      tile.updatePosition({x: size - 1, y});
      this.grid.insertTile(tile);
    }
  }

  // Left column gets bottom row (including right corner)
  for (let x = size - 1; x >= 0; x--) {
    const tile = bottomRow[x];
    if (tile) {
      tile.updatePosition({x, y: 0});
      this.grid.insertTile(tile);
    }
  }
};

// Swap two tiles
GameManager.prototype.swapTwoTiles = function (pos1, pos2) {
  const tile1 = this.grid.cellContent(pos1);
  const tile2 = this.grid.cellContent(pos2);

  if (!tile1 || !tile2) return;

  // Swap positions
  const tempPos = {x: tile1.x, y: tile1.y};
  tile1.updatePosition({x: tile2.x, y: tile2.y});
  tile2.updatePosition(tempPos);

  // Update grid
  this.grid.insertTile(tile1);
  this.grid.insertTile(tile2);
};

// Undo last move
GameManager.prototype.undoLastMove = function () {
  if (this.undoStack.length === 0) return;

  const lastState = this.undoStack.pop();
  this.grid = new Grid(lastState.grid.size, lastState.grid.cells);
  this.score = lastState.score;
  this.over = lastState.over;
  this.won = lastState.won;
  this.keepPlaying = lastState.keepPlaying;
};

// Save current state for undo
GameManager.prototype.saveStateForUndo = function () {
  if (this.undoStack.length >= 3) {
    this.undoStack.shift();
  }
  this.undoStack.push(this.serialize());
};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    props:       this.props,
    propUsage:   this.propUsage
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

  if (this.isGameTerminated() || this.blockInput) return; // Don't do anything if the game's over

  // Save state for undo
  this.saveStateForUndo();

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
