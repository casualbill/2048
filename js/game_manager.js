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
  // Add current score to cumulative total
  if (this.score > 0) {
    var currentCumulative = parseInt(this.storageManager.getCumulativeTotalScore());
    this.storageManager.setCumulativeTotalScore(currentCumulative + this.score);
  }
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

  // Initialize achievement tracking variables
  this.achievements = this.storageManager.getAchievements();
  this.currentMaxTile = this.getMaxTileValue();
  this.moveCount = 0;
  this.consecutiveMerges = 0;
  this.consecutiveMergesStart = Date.now();
  this.startTime = Date.now();
  this.usedDirections = new Set();
  this.gameStart = true;
  this.perfectStartCount = 0;

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
    achievements: this.achievements
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
        if (next && next.value === tile.value && !next.mergedFrom) {
          var mergedTile = new Tile(positions.next, tile.value * 2);
          mergedTile.mergedFrom = [tile, next];

          self.grid.insertTile(mergedTile);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += mergedTile.value;

          // Check for milestone achievements
          self.checkMilestoneAchievements(mergedTile.value);

          // Check for四面楚歌 achievement
          self.checkSurroundedAchievement(mergedTile);

          // Check for险中求胜 achievement
          self.checkDesperateVictoryAchievement(mergedTile.value);

          // Increment consecutive merges
          merged = true;

          // The mighty 2048 tile
          if (mergedTile.value === 2048) self.won = true;
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
    this.moveCount++;
    this.usedDirections.add(direction);

    // Update cumulative achievements
    this.updateCumulativeAchievements();

    // Check for consecutive merges
    if (merged) {
      var now = Date.now();
      if (now - this.consecutiveMergesStart <= 10000) { // 10 seconds
        this.consecutiveMerges++;
        this.checkComboAchievement();
      } else {
        this.consecutiveMerges = 1;
        this.consecutiveMergesStart = now;
      }
    } else {
      this.consecutiveMerges = 0;
    }

    // Check for完美开局 achievement
    if (this.gameStart && this.moveCount <= 10) {
      this.perfectStartCount++;
      if (this.getMaxTileValue() < 16) {
        this.checkPerfectStartAchievement();
      } else {
        this.gameStart = false;
      }
    } else if (this.moveCount > 10) {
      this.gameStart = false;
    }

    // Add random tile and update current max tile
    var newTileValue = this.addRandomTile();
    if (newTileValue === 4) {
      this.achievements.幸运眷顾.progress++;
      if (!this.achievements.幸运眷顾.unlocked && this.achievements.幸运眷顾.progress >= this.achievements.幸运眷顾.max) {
        this.achievements.幸运眷顾.unlocked = true;
      }
    }
    this.currentMaxTile = this.getMaxTileValue();

    // Check for清道夫 achievement
    this.checkCleanupAchievement();

    // Check for布局之美 achievement
    this.checkLayoutBeautyAchievement();

    // Check for滴水不漏 achievement
    this.checkNoLeakAchievement();

    // Check if game over
        if (!this.movesAvailable()) {
          this.over = true; // Game over!
          // Add current score to cumulative total
          var currentCumulative = parseInt(this.storageManager.getCumulativeTotalScore());
          this.storageManager.setCumulativeTotalScore(currentCumulative + this.score);
          this.checkGameOverAchievement();
        }

    // Update achievements storage
    this.storageManager.setAchievements(this.achievements);

    // Update the actuator
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

// Helper method to get the maximum tile value on the grid
GameManager.prototype.getMaxTileValue = function () {
  var maxValue = 0;
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value > maxValue) {
      maxValue = tile.value;
    }
  });
  return maxValue;
};

// Update cumulative achievements
GameManager.prototype.updateCumulativeAchievements = function () {
  // 勤奋耕耘: 累计滑动操作次数达到5000次
  this.achievements.勤奋耕耘.progress++;
  if (!this.achievements.勤奋耕耘.unlocked && this.achievements.勤奋耕耘.progress >= this.achievements.勤奋耕耘.max) {
    this.achievements.勤奋耕耘.unlocked = true;
  }

  // 巨额财富: 累计游戏总得分达到1000000分
    var cumulativeTotal = parseInt(this.storageManager.getCumulativeTotalScore());
    // Add current game's score to cumulative total for progress display
    this.achievements.巨额财富.progress = cumulativeTotal + this.score;
    if (!this.achievements.巨额财富.unlocked && (cumulativeTotal + this.score) >= this.achievements.巨额财富.max) {
      this.achievements.巨额财富.unlocked = true;
    }
};

// Check milestone achievements (数字里程碑)
GameManager.prototype.checkMilestoneAchievements = function (value) {
  // 初窥门径: 合成512
  if (value === 512 && !this.achievements.初窥门径.unlocked) {
    this.achievements.初窥门径.unlocked = true;
  }

  // 融会贯通: 合成1024
  if (value === 1024 && !this.achievements.融会贯通.unlocked) {
    this.achievements.融会贯通.unlocked = true;
    // Check for速战速决 achievement
    var elapsedTime = Date.now() - this.startTime;
    if (elapsedTime <= 120000) { // 2 minutes
      this.achievements.速战速决.unlocked = true;
    }
  }

  // 登峰造极: 合成2048
  if (value === 2048 && !this.achievements.登峰造极.unlocked) {
    this.achievements.登峰造极.unlocked = true;
    // Update十战十胜 achievement
    this.achievements.十战十胜.progress++;
    if (!this.achievements.十战十胜.unlocked && this.achievements.十战十胜.progress >= this.achievements.十战十胜.max) {
      this.achievements.十战十胜.unlocked = true;
    }
  }

  // 超越极限: 合成4096
  if (value === 4096 && !this.achievements.超越极限.unlocked) {
    this.achievements.超越极限.unlocked = true;
  }

  // 神乎其技: 合成8192
  if (value === 8192 && !this.achievements.神乎其技.unlocked) {
    this.achievements.神乎其技.unlocked = true;
  }

  // 合并狂人: 累计合成512方块50次
  if (value === 512) {
    this.achievements.合并狂人.progress++;
    if (!this.achievements.合并狂人.unlocked && this.achievements.合并狂人.progress >= this.achievements.合并狂人.max) {
      this.achievements.合并狂人.unlocked = true;
    }
  }

  // Check for单极制霸 achievement
  if (value === 1024 && this.usedDirections.size <= 2 && !this.achievements.单极制霸.unlocked) {
    this.achievements.单极制霸.unlocked = true;
  }
};

// Check combo achievement (连击高手)
GameManager.prototype.checkComboAchievement = function () {
  if (this.consecutiveMerges >= 5 && !this.achievements.连击高手.unlocked) {
    this.achievements.连击高手.unlocked = true;
  }
};

// Check perfect start achievement (完美开局)
GameManager.prototype.checkPerfectStartAchievement = function () {
  if (this.perfectStartCount >= 10 && !this.achievements.完美开局.unlocked) {
    this.achievements.完美开局.unlocked = true;
  }
};

// Check surrounded achievement (四面楚歌)
GameManager.prototype.checkSurroundedAchievement = function (tile) {
  var x = tile.x;
  var y = tile.y;
  var size = this.grid.size;

  // Check all four adjacent cells
  var adjacentCells = [
    { x: x - 1, y: y }, // Left
    { x: x + 1, y: y }, // Right
    { x: x, y: y - 1 }, // Up
    { x: x, y: y + 1 }  // Down
  ];

  var allSurrounded = true;
  for (var i = 0; i < adjacentCells.length; i++) {
    var cell = adjacentCells[i];
    if (cell.x < 0 || cell.x >= size || cell.y < 0 || cell.y >= size) {
      // Out of bounds, not surrounded
      allSurrounded = false;
      break;
    }
    var adjacentTile = this.grid.cellContent(cell);
    if (!adjacentTile || adjacentTile.value <= 8) {
      // No tile or tile value <=8, not surrounded
      allSurrounded = false;
      break;
    }
  }

  if (allSurrounded && !this.achievements.四面楚歌.unlocked) {
    this.achievements.四面楚歌.unlocked = true;
  }
};

// Check cleanup achievement (清道夫)
GameManager.prototype.checkCleanupAchievement = function () {
  var size = this.grid.size;
  var rows = [];
  var cols = [];

  // Initialize rows and cols arrays
  for (var i = 0; i < size; i++) {
    rows[i] = true;
    cols[i] = true;
  }

  // Check each cell
  for (var x = 0; x < size; x++) {
    for (var y = 0; y < size; y++) {
      if (this.grid.cellContent({ x: x, y: y })) {
        rows[y] = false;
        cols[x] = false;
      }
    }
  }

  // Check if any row or column is completely empty
  var isCleanup = rows.some(function (isEmpty) { return isEmpty; }) || cols.some(function (isEmpty) { return isEmpty; });
  if (isCleanup && !this.achievements.清道夫.unlocked) {
    this.achievements.清道夫.unlocked = true;
  }
};

// Check layout beauty achievement (布局之美)
GameManager.prototype.checkLayoutBeautyAchievement = function () {
  var size = this.grid.size;
  var totalCells = size * size;
  var filledCells = 0;
  var maxValue = 0;
  var maxPosition = null;

  // Count filled cells and find max tile
  for (var x = 0; x < size; x++) {
    for (var y = 0; y < size; y++) {
      var tile = this.grid.cellContent({ x: x, y: y });
      if (tile) {
        filledCells++;
        if (tile.value > maxValue) {
          maxValue = tile.value;
          maxPosition = { x: x, y: y };
        }
      }
    }
  }

  // Check if at least 80% filled
  if (filledCells / totalCells >= 0.8 && maxPosition) {
    // Check if max tile is at corner
    var isCorner = (maxPosition.x === 0 && maxPosition.y === 0) ||
                   (maxPosition.x === size - 1 && maxPosition.y === 0) ||
                   (maxPosition.x === 0 && maxPosition.y === size - 1) ||
                   (maxPosition.x === size - 1 && maxPosition.y === size - 1);
    if (isCorner && !this.achievements.布局之美.unlocked) {
      this.achievements.布局之美.unlocked = true;
    }
  }
};

// Check no leak achievement (滴水不漏)
GameManager.prototype.checkNoLeakAchievement = function () {
  var size = this.grid.size;
  var totalCells = size * size;
  var filledCells = 0;
  var maxValue = 0;

  // Count filled cells and find max tile
  for (var x = 0; x < size; x++) {
    for (var y = 0; y < size; y++) {
      var tile = this.grid.cellContent({ x: x, y: y });
      if (tile) {
        filledCells++;
        if (tile.value > maxValue) {
          maxValue = tile.value;
        }
      }
    }
  }

  // Check if all cells are filled and max value < 1024
  if (filledCells === totalCells && maxValue < 1024 && !this.achievements.滴水不漏.unlocked) {
    this.achievements.滴水不漏.unlocked = true;
  }
};

// Check desperate victory achievement (险中求胜)
GameManager.prototype.checkDesperateVictoryAchievement = function (value) {
  var size = this.grid.size;
  var totalCells = size * size;
  var filledCells = 0;

  // Count filled cells
  for (var x = 0; x < size; x++) {
    for (var y = 0; y < size; y++) {
      if (this.grid.cellContent({ x: x, y: y })) {
        filledCells++;
      }
    }
  }

  // Check conditions: score < 500, filled cells >= 14, and just merged 256
  if (this.score < 500 && filledCells >= 14 && value === 256 && !this.achievements.险中求胜.unlocked) {
    this.achievements.险中求胜.unlocked = true;
  }
};

// Check game over achievement (失败乃成功之母)
GameManager.prototype.checkGameOverAchievement = function () {
  this.achievements.失败乃成功之母.progress++;
  if (!this.achievements.失败乃成功之母.unlocked && this.achievements.失败乃成功之母.progress >= this.achievements.失败乃成功之母.max) {
    this.achievements.失败乃成功之母.unlocked = true;
  }
};

// Modify addRandomTile to return the value of the added tile
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
    return value;
  }
  return null;
};
