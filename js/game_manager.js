function GameManager(size, tiles, shape, storageManager) {
  this.size = size;
  this.shape = shape || 'square';
  this.storageManager = storageManager || new LocalStorageManager();
  this.score = 0;
  this.over = false;
  this.won = false;
  this.keepPlaying = false;

  // Adjust size for different shapes
  this.adjustSizeForShape();

  this.grid = new Grid(size, shape);
  this.actuator = new HTMLActuator();

  this.setup(tiles);
}

GameManager.prototype.adjustSizeForShape = function() {
  switch(this.shape) {
    case 'diamond':
      this.size = 7;
      break;
    case 'circle':
      this.size = 5;
      break;
    case 'trapezoid':
      this.size = 6;
      break;
    case 'square-ring':
      this.size = 5;
      break;
    default:
      this.size = 4;
      break;
  }
};

GameManager.prototype.setup = function(tiles) {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid = new Grid(previousState.grid.size, previousState.grid.shape);
    this.grid.cells = previousState.grid.cells;
    this.score = previousState.score;
    this.over = previousState.over;
    this.won = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    // Initialize with random tiles
    this.grid.addRandomTile();
    this.grid.addRandomTile();
  }

  // Update the actuator
  this.actuate();
};

GameManager.prototype.restart = function() {
  this.storageManager.clearGameState();
  this.actuator.restart();
  this.setup();
};

GameManager.prototype.keepPlayingGame = function() {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won message
  this.actuate();
};

GameManager.prototype.actuate = function() {
  if (this.storageManager.getBestScore(this.shape) < this.score) {
    this.storageManager.setBestScore(this.shape, this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score: this.score,
    bestScore: this.storageManager.getBestScore(this.shape),
    over: this.over,
    won: this.won,
    keepPlaying: this.keepPlaying
  });
};

GameManager.prototype.serialize = function() {
  return {
    grid: {
      size: this.size,
      shape: this.shape,
      cells: this.grid.serialize()
    },
    score: this.score,
    over: this.over,
    won: this.won,
    keepPlaying: this.keepPlaying
  };
};

GameManager.prototype.restart = function() {
  this.storageManager.clearGameState();
  this.actuator.restart();
  this.setup();
};

GameManager.prototype.keepPlayingGame = function() {
  this.keepPlaying = true;
  this.actuator.continueGame();
  this.actuate();
};

GameManager.prototype.move = function(direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.over || this.won) return;

  var cell, tile;
  var vector = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved = false;

  this.prepareTiles();

  traversals.x.forEach(function(x) {
    traversals.y.forEach(function(y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next = self.grid.cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          tile.updatePosition(positions.next);

          self.score += merged.value;

          if (merged.value === 2048) self.won = true;

          moved = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true;
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true;
    }

    this.actuate();
  }
};

GameManager.prototype.getVector = function(direction) {
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };
  return map[direction];
};

GameManager.prototype.buildTraversals = function(vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  if (vector.x === 1) traversals.x.reverse();
  if (vector.y === 1) traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function(cell, vector) {
  var previous;
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell
  };
};

GameManager.prototype.movesAvailable = function() {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

GameManager.prototype.tileMatchesAvailable = function() {
  var self = this;
  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell = { x: x + vector.x, y: y + vector.y };
          var other = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function(first, second) {
  return first.x === second.x && first.y === second.y;
};

GameManager.prototype.prepareTiles = function() {
  this.grid.eachCell(function(x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

GameManager.prototype.moveTile = function(tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

GameManager.prototype.addRandomTile = function() {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);
    this.grid.insertTile(tile);
  }
};
