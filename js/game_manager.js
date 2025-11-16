function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  // 合并倒计时压力机制
  this.mergeTimer     = null;
  this.mergeTimerDuration = 5000; // 5秒
  this.mergeTimerActive  = false;
  this.mergeTimerStartTime = 0;
  // 倒计时炸弹随机事件
  this.bombs          = [];
  this.maxBombs       = 2;
  this.bombInterval   = 10000; // 每10秒生成一个炸弹
  this.bombDegradeInterval = 5000; // 每5秒降级
  this.bombTimer      = null;
  // 初始化炸弹生成定时器
  this.startBombTimer();
// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  
  // 重置合并倒计时
  this.resetMergeTimer();
  
  // 清除所有炸弹
  this.bombs.forEach(function (bomb) {
    if (bomb.bombTimer) {
      clearInterval(bomb.bombTimer);
      bomb.bombTimer = null;
    }
  });
  this.bombs = [];
  
  // 重新设置游戏
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// 开始合并倒计时
GameManager.prototype.startMergeTimer = function () {
  this.resetMergeTimer();
  this.mergeTimerActive = true;
  this.mergeTimerStartTime = Date.now();
  var self = this;
  this.mergeTimer = setTimeout(function () {
    self.mergeTimerTimeout();
  }, this.mergeTimerDuration);
};

// 重置合并倒计时
GameManager.prototype.resetMergeTimer = function () {
  if (this.mergeTimer) {
    clearTimeout(this.mergeTimer);
    this.mergeTimer = null;
  }
  this.mergeTimerActive = false;
  this.mergeTimerStartTime = 0;
};

// 合并倒计时超时处理
GameManager.prototype.mergeTimerTimeout = function () {
  this.mergeTimerActive = false;
  // 所有数值≥4的块分裂为两个数值减半的块
  this.splitTiles();
};

// 分裂所有数值≥4的块
GameManager.prototype.splitTiles = function () {
  var newTiles = [];
  var self = this;
  
  // 收集所有需要分裂的块
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value >= 4 && !tile.isBomb) {
      var halfValue = Math.floor(tile.value / 2);
      // 移除原始块
      self.grid.removeTile(tile);
      // 尝试生成两个新块
      for (var i = 0; i < 2; i++) {
        var position = self.grid.randomAvailableCell();
        if (position) {
          var newTile = new Tile(position, halfValue);
          newTiles.push(newTile);
        }
      }
    }
  });
  
  // 添加新生成的块
  newTiles.forEach(function (tile) {
    self.grid.insertTile(tile);
  });
  
  // 更新游戏状态
  this.actuate();
};

// 开始炸弹生成定时器
GameManager.prototype.startBombTimer = function () {
  var self = this;
  this.bombTimer = setInterval(function () {
    self.generateBomb();
  }, this.bombInterval);
};

// 生成炸弹
GameManager.prototype.generateBomb = function () {
  if (this.bombs.length < this.maxBombs && this.grid.cellsAvailable()) {
    var position = this.grid.randomAvailableCell();
    if (position) {
      var bomb = new Tile(position, 1024);
      bomb.isBomb = true;
      bomb.bombTimer = setInterval(this.degradeBomb.bind(this, bomb), this.bombDegradeInterval);
      this.bombs.push(bomb);
      this.grid.insertTile(bomb);
      this.actuate();
    }
  }
};

// 炸弹降级
GameManager.prototype.degradeBomb = function (bomb) {
  if (!bomb || bomb.value <= 2) {
    // 炸弹爆炸
    this.explodeBomb(bomb);
    return;
  }
  
  bomb.value = Math.floor(bomb.value / 2);
  this.actuate();
};

// 炸弹爆炸
GameManager.prototype.explodeBomb = function (bomb) {
  if (!bomb) return;
  
  // 移除炸弹
  var index = this.bombs.indexOf(bomb);
  if (index > -1) {
    this.bombs.splice(index, 1);
  }
  
  if (bomb.bombTimer) {
    clearInterval(bomb.bombTimer);
    bomb.bombTimer = null;
  }
  
  this.grid.removeTile(bomb);
  
  // 所有数值≥4的块分裂为两个数值减半的块
  this.splitTiles();
  
  this.actuate();
};

// 拆弹处理
GameManager.prototype.defuseBomb = function (bombTile, regularTile) {
  if (bombTile.isBomb && regularTile.value === bombTile.value) {
    // 拆弹成功，获得炸弹数值×2的分数
    this.score += bombTile.value * 2;
    
    // 移除炸弹
    var index = this.bombs.indexOf(bombTile);
    if (index > -1) {
      this.bombs.splice(index, 1);
    }
    
    if (bombTile.bombTimer) {
      clearInterval(bombTile.bombTimer);
      bombTile.bombTimer = null;
    }
    
    this.grid.removeTile(bombTile);
    this.grid.removeTile(regularTile);
    
    // 重置合并倒计时
    this.resetMergeTimer();
    
    return true;
  }
  return false;
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.over        = false;
    this.won         = false;
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
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
  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    mergeTimerActive: this.mergeTimerActive,
    mergeTimerStartTime: this.mergeTimerStartTime,
    mergeTimerDuration: this.mergeTimerDuration
  });
};

// Represent the current game as an object
  GameManager.prototype.serialize = function () {
    return {
      grid:        this.grid.serialize(),
      score:       this.score,
      over:        this.over,
      won:         this.won,
      terminated:  this.isGameTerminated()
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
      tile.savePosition();
    }
// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
};

// Move a tile and its representation
  if (this.isGameTerminated()) return; // Don't do anything if the game's over
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;

  var vector     = this.getVector(direction);
};
  var moved      = false;
// Move tiles on the grid in the specified direction
  // Save the current tile positions and remove merger information
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
        var next      = self.grid.cellContent(positions.next);
  var moved      = false;
        // Only one merger per row traversal?

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);
      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next = self.grid.cellContent(positions.next);
        // Only one merger per row traversal?
        if (next && next.value === tile.value) {
          // 检查是否是拆弹
          if (next.isBomb || tile.isBomb) {
            var bombTile = next.isBomb ? next : tile;
            var regularTile = next.isBomb ? tile : next;
            
            // 拆弹成功
            if (self.defuseBomb(bombTile, regularTile)) {
              moved = true;
            }
          } else if (!next.mergedFrom) {
              // 普通合并
              var merged = new Tile(positions.next, tile.value * 2);
              merged.mergedFrom = [tile, next];

              moved = true; // The tile moved from its original cell!
              self.grid.removeTile(tile);

              // Converge the two tiles' positions
              tile.updatePosition(positions.next);

              // Update the score
              self.score += merged.value;
              // 合并成功，重置合并倒计时
              self.resetMergeTimer();
              // 有20%概率启动新的倒计时
              if (Math.random() < 0.2) {
                self.startMergeTimer();
              }
            }
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });

    // If any tile moved
    if (moved) {
      // Add a new random tile
      self.addRandomTile();

      // Check if the game is over
      if (!self.movesAvailable()) {
        self.over = true; // Game over!
      }

      // Update the game state
      self.actuate();
    }
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
      }
    });
  });
// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
GameManager.prototype.findFarthestPosition = function (cell, vector) {


  // Progress towards the vector direction until an obstacle is found
  return map[direction];
};
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

    next: cell // Used to check if a merge is required
    traversals.x.push(pos);
    traversals.y.push(pos);
  }
GameManager.prototype.movesAvailable = function () {
  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  return traversals;

};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

  return {
            return true; // These two tiles can be merged
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.positionsEqual = function (first, second) {
      if (tile) {
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
