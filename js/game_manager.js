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

// Adds an energy tile (value 1, blue flashing)
GameManager.prototype.addEnergyTile = function () {
  if (this.grid.cellsAvailable()) {
    var tile = new Tile(this.grid.randomAvailableCell(), 1, true);
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
        if (tile.isEnergy && next && next.isEnergy) {
            // 2. 两个能量方块合并生成引力核心
            var gravityCore = new Tile(positions.next, 0, false, true);
            gravityCore.gravityStrength = 1;
            self.grid.insertTile(gravityCore);
            self.grid.removeTile(tile);
            self.grid.removeTile(next);
          } else if (!tile.isGravityCore && !next.isGravityCore && next && next.value === tile.value && !next.mergedFrom) {
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
    // 1. 有10%概率生成能量方块
    if (Math.random() < 0.1) {
      this.addEnergyTile();
    } else {
      this.addRandomTile();
    }

    // 处理引力核心效果
    this.processGravityCores();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// 处理引力核心效果
GameManager.prototype.processGravityCores = function () {
  var gravityCores = [];
  var self = this;

  // 收集所有引力核心
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.isGravityCore) {
      gravityCores.push(tile);
    }
  });

  if (gravityCores.length === 0) return;

  // 为每个普通方块找到最强的吸引核心
  var tileCoreMap = new Map();
  
  // 首先收集所有可被吸引的方块及其候选核心
  this.grid.eachCell(function (x, y, tile) {
    if (tile && !tile.isGravityCore && !tile.isEnergy) {
      // 检查每个引力核心是否在相邻8格
      var candidateCores = [];
      gravityCores.forEach(function (core) {
        var adjacentCells = self.getAdjacentCells(core.x, core.y);
        var isAdjacent = adjacentCells.some(function (cell) {
          return cell.x === tile.x && cell.y === tile.y;
        });
        if (isAdjacent) {
          candidateCores.push(core);
        }
      });
      
      if (candidateCores.length > 0) {
        // 找到强度最大的核心
        var strongestCore = candidateCores.reduce(function (prev, current) {
          return prev.gravityStrength > current.gravityStrength ? prev : current;
        });
        
        // 如果有多个强度相同的核心，随机选择一个
        var maxStrength = strongestCore.gravityStrength;
        var strongestCores = candidateCores.filter(function (core) {
          return core.gravityStrength === maxStrength;
        });
        strongestCore = strongestCores[Math.floor(Math.random() * strongestCores.length)];
        
        tileCoreMap.set(tile, strongestCore);
      }
    }
  });
  
  // 处理每个方块的吸引
  tileCoreMap.forEach(function (core, targetTile) {
    // 计算吸引方向
    var directionX = core.x - targetTile.x;
    var directionY = core.y - targetTile.y;
    var moveX = directionX !== 0 ? (directionX / Math.abs(directionX)) : 0;
    var moveY = directionY !== 0 ? (directionY / Math.abs(directionY)) : 0;
    
    // 检查目标位置是否可用
    var targetPos = { x: targetTile.x + moveX, y: targetTile.y + moveY };
    
    if (self.grid.cellAvailable(targetPos)) {
      // 移动方块
      self.moveTile(targetTile, targetPos);
      
      // 5. 方块被吸引时销毁，引力强度增加log₂(方块数值)
      var logValue = Math.log2(targetTile.value);
      core.gravityStrength += logValue;
      
      // 移除被吸引的方块
      self.grid.removeTile(targetTile);
    }
  });

  // 8. 处理所有引力核心的爆炸逻辑
  // 重新收集所有引力核心，因为有些可能已经被移除
  var updatedGravityCores = [];
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.isGravityCore) {
      updatedGravityCores.push(tile);
    }
  });

  updatedGravityCores.forEach(function (core) {
    if (core.gravityStrength >= 10) {
      var aroundCells = self.getAdjacentCells(core.x, core.y);
      var allFilled = true;
      
      // 检查周围8格是否被填满
      aroundCells.forEach(function (cell) {
        if (!self.grid.cellOccupied(cell)) {
          allFilled = false;
        }
      });
      
      if (allFilled) {
        // 爆炸，清空核心和周围8格
        self.grid.removeTile(core);
        aroundCells.forEach(function (cell) {
          var tile = self.grid.cellContent(cell);
          if (tile) {
            self.grid.removeTile(tile);
          }
        });
      }
    }
  });
};

// 获取8个相邻的格子
GameManager.prototype.getAdjacentCells = function (x, y) {
  var adjacent = [];
  for (var dx = -1; dx <= 1; dx++) {
    for (var dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      var newX = x + dx;
      var newY = y + dy;
      if (newX >= 0 && newX < this.size && newY >= 0 && newY < this.size) {
        adjacent.push({ x: newX, y: newY });
      }
    }
  }
  return adjacent;
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
