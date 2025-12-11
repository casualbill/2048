function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator(this.inputManager);

  this.startTiles     = 2;
  this.gameMode       = "normal"; // normal, event, doom
  this.eventHistory   = [];
  this.luckyShield    = false;
  this.forbiddenDirection = -1;
  this.reverseDirection = false;
  this.frozenLine     = null; // {type: 'row'/'col', index: 0-3}
  this.gameStartTime  = Date.now();

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("freezeLine", this.freezeLine.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  var modeRadios = document.querySelectorAll('input[name="game-mode"]');
  for (var i = 0; i < modeRadios.length; i++) {
    if (modeRadios[i].checked) {
      this.gameMode = modeRadios[i].value;
      break;
    }
  }
  
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.eventHistory = [];
  this.luckyShield = false;
  this.forbiddenDirection = -1;
  this.reverseDirection = false;
  this.frozenLine = null;
  this.gameStartTime = Date.now();
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
  // Get game mode from radio buttons
  var modeRadios = document.querySelectorAll('input[name="game-mode"]');
  for (var i = 0; i < modeRadios.length; i++) {
    if (modeRadios[i].checked) {
      this.gameMode = modeRadios[i].value;
      break;
    }
  }
  
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

  // Add to leaderboard if game ended
  if (this.over || this.won) {
    this.storageManager.addToLeaderboard(this.score, this.eventHistory.length, this.gameDuration);
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
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  var gameDuration = "";
  if (this.over || this.won) {
    var seconds = Math.floor((Date.now() - this.gameStartTime) / 1000);
    var minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    gameDuration = minutes + "分" + seconds + "秒";
    this.gameDuration = gameDuration;
  }
  
  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    eventHistory: this.eventHistory,
    gameDuration: gameDuration,
    leaderboard: this.storageManager.getLeaderboard()
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
  // Don't move tile if it's in frozen line
  if (this.frozenLine) {
    if ((this.frozenLine.type === 'row' && tile.y === this.frozenLine.index) ||
        (this.frozenLine.type === 'col' && tile.x === this.frozenLine.index)) {
      return;
    }
  }
  
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  // Handle forbidden direction
  if (this.forbiddenDirection === direction) {
    this.actuator.shakeBoard();
    this.forbiddenDirection = -1;
    return;
  }
  
  // Handle reverse direction
  if (this.reverseDirection) {
    direction = (direction + 2) % 4;
    this.reverseDirection = false;
    this.actuator.hideReverseIcon();
  }

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

    // Reset frozen line after move
    if (this.frozenLine) {
      this.actuator.hideFreezeButtons();
      this.frozenLine = null;
    }
    
    // Trigger random event after successful move
    if (this.gameMode !== "normal" && Math.random() < 0.30) {
      this.triggerRandomEvent();
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
    
    // Don't move through frozen line
    if (this.frozenLine) {
      if (this.frozenLine.type === 'row' && vector.y !== 0 && cell.y === this.frozenLine.index) {
        break;
      }
      if (this.frozenLine.type === 'col' && vector.x !== 0 && cell.x === this.frozenLine.index) {
        break;
      }
    }
    
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

      if (tile && tile.value !== 'X') {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value && other.value !== 'X') {
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

// Trigger random event based on game mode
GameManager.prototype.triggerRandomEvent = function () {
  var isPositive = false;
  
  // Determine event type probability
  if (this.gameMode === "event") {
    isPositive = Math.random() < 0.6; // 3:2 ratio
  } else if (this.gameMode === "doom") {
    isPositive = Math.random() < 0.2; // 1:4 ratio
  }
  
  // Use lucky shield if available and event is negative
  if (!isPositive && this.luckyShield) {
    this.luckyShield = false;
    this.actuator.hideShield();
    this.addEvent("幸运护盾", "抵消了一次负面事件");
    this.actuator.showEventMessage("幸运护盾生效！抵消了一次负面事件", "positive");
    return;
  }
  
  if (isPositive) {
    this.triggerPositiveEvent();
  } else {
    this.triggerNegativeEvent();
  }
};

// Trigger random positive event
GameManager.prototype.triggerPositiveEvent = function () {
  var events = [
    this.luckyDouble.bind(this),
    this.refreshReward.bind(this),
    this.freezeLines.bind(this),
    this.smartMerge.bind(this),
    this.luckyShieldEvent.bind(this)
  ];
  
  var eventIndex = Math.floor(Math.random() * events.length);
  events[eventIndex]();
};

// Trigger random negative event
GameManager.prototype.triggerNegativeEvent = function () {
  var events = [
    this.poisonTile.bind(this),
    this.numberBacktrack.bind(this),
    this.randomForbid.bind(this),
    this.numberChaos.bind(this),
    this.gravityReverse.bind(this)
  ];
  
  var eventIndex = Math.floor(Math.random() * events.length);
  events[eventIndex]();
};

// 1. 幸运倍增：随机选择一个方块，数值翻倍
GameManager.prototype.luckyDouble = function () {
  var tiles = [];
  this.grid.eachCell(function(x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length === 0) return;
  
  var tile = tiles[Math.floor(Math.random() * tiles.length)];
  tile.value *= 2;
  this.addEvent("幸运倍增", "方块 " + tile.value/2 + " 翻倍为 " + tile.value);
  this.actuator.showEventMessage("幸运倍增！一个方块数值翻倍！", "positive");
  this.actuator.flashTile(tile, "gold");
  this.actuate();
};

// 2. 刷新奖励：随机生成高数值方块
GameManager.prototype.refreshReward = function () {
  if (!this.grid.cellsAvailable()) return;
  
  var value = Math.random();
  var tileValue;
  if (value < 0.5) tileValue = 8;
  else if (value < 0.8) tileValue = 16;
  else if (value < 0.95) tileValue = 32;
  else tileValue = 64;
  
  var tile = new Tile(this.grid.randomAvailableCell(), tileValue);
  this.grid.insertTile(tile);
  this.addEvent("刷新奖励", "生成了 " + tileValue + " 方块");
  this.actuator.showEventMessage("刷新奖励！获得高数值方块！", "positive");
  this.actuator.flashTile(tile, "blue");
  this.actuate();
};

// 3. 冻结行列：显示冻结按钮
GameManager.prototype.freezeLines = function () {
  this.addEvent("冻结行列", "可选择冻结一行或一列");
  this.actuator.showEventMessage("冻结行列！选择要冻结的行或列", "positive");
  this.actuator.showFreezeButtons();
};

// Handle freeze line selection
GameManager.prototype.freezeLine = function (data) {
  this.frozenLine = data;
  this.addEvent("冻结行列", "冻结了" + (data.type === 'row' ? "第" + (data.index + 1) + "行" : "第" + (data.index + 1) + "列"));
  this.actuator.highlightFrozenLine(data);
};

// 4. 智能合并：自动合并最大的两个相同方块
GameManager.prototype.smartMerge = function () {
  var tiles = [];
  this.grid.eachCell(function(x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length < 2) return;
  
  // Find largest value with at least two tiles
  tiles.sort(function(a, b) { return b.value - a.value; });
  
  var largestValue = tiles[0].value;
  var largestTiles = tiles.filter(function(t) { return t.value === largestValue; });
  
  if (largestTiles.length < 2) {
    largestValue = tiles[1].value;
    largestTiles = tiles.filter(function(t) { return t.value === largestValue; });
  }
  
  if (largestTiles.length >= 2) {
    var tile1 = largestTiles[0];
    var tile2 = largestTiles[1];
    
    // Move tile2 to tile1 position and merge
    var merged = new Tile(tile1, tile1.value * 2);
    merged.mergedFrom = [tile1, tile2];
    
    this.grid.removeTile(tile2);
    this.grid.removeTile(tile1);
    this.grid.insertTile(merged);
    
    this.score += merged.value;
    if (merged.value === 2048) this.won = true;
    
    this.addEvent("智能合并", "自动合并了两个 " + largestValue + " 方块");
    this.actuator.showEventMessage("智能合并！自动合并最大的相同方块！", "positive");
    this.actuate();
  }
};

// 5. 幸运护盾：获得一次保护机会
GameManager.prototype.luckyShieldEvent = function () {
  this.luckyShield = true;
  this.addEvent("幸运护盾", "获得一次负面事件抵消机会");
  this.actuator.showEventMessage("幸运护盾！获得一次负面事件抵消机会！", "positive");
  this.actuator.showShield();
};

// 1. 毒方块：生成无法合并的毒方块
GameManager.prototype.poisonTile = function () {
  if (!this.grid.cellsAvailable()) return;
  
  var tile = new Tile(this.grid.randomAvailableCell(), 'X');
  this.grid.insertTile(tile);
  this.addEvent("毒方块", "生成了无法合并的毒方块");
  this.actuator.showEventMessage("毒方块！出现了无法合并的毒方块！", "negative");
  this.actuate();
};

// 2. 数字倒退：随机选择一个方块数值减半
GameManager.prototype.numberBacktrack = function () {
  var tiles = [];
  this.grid.eachCell(function(x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length === 0) return;
  
  var tile = tiles[Math.floor(Math.random() * tiles.length)];
  var oldValue = tile.value;
  tile.value = Math.max(2, Math.floor(tile.value / 2));
  this.addEvent("数字倒退", "方块 " + oldValue + " 变为 " + tile.value);
  this.actuator.showEventMessage("数字倒退！一个方块数值减半！", "negative");
  this.actuator.flashTile(tile, "darkred");
  this.actuate();
};

// 3. 随机禁操作：禁止一个移动方向
GameManager.prototype.randomForbid = function () {
  this.forbiddenDirection = Math.floor(Math.random() * 4);
  var directions = ["上", "右", "下", "左"];
  this.addEvent("随机禁操作", "禁止向" + directions[this.forbiddenDirection] + "移动");
  this.actuator.showEventMessage("随机禁操作！禁止向" + directions[this.forbiddenDirection] + "移动！", "negative");
  this.actuator.showForbiddenDirection(this.forbiddenDirection);
};

// 4. 数字混乱：随机交换两个方块位置
GameManager.prototype.numberChaos = function () {
  var tiles = [];
  this.grid.eachCell(function(x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length < 2) return;
  
  var index1 = Math.floor(Math.random() * tiles.length);
  var index2 = Math.floor(Math.random() * tiles.length);
  while (index2 === index1) {
    index2 = Math.floor(Math.random() * tiles.length);
  }
  
  var tile1 = tiles[index1];
  var tile2 = tiles[index2];
  
  // Swap positions
  var tempX = tile1.x, tempY = tile1.y;
  this.grid.cells[tile1.x][tile1.y] = null;
  this.grid.cells[tile2.x][tile2.y] = null;
  
  tile1.updatePosition({x: tile2.x, y: tile2.y});
  tile2.updatePosition({x: tempX, y: tempY});
  
  this.grid.cells[tile1.x][tile1.y] = tile1;
  this.grid.cells[tile2.x][tile2.y] = tile2;
  
  this.addEvent("数字混乱", "交换了 " + tile1.value + " 和 " + tile2.value + " 的位置");
  this.actuator.showEventMessage("数字混乱！两个方块位置被交换！", "negative");
  this.actuate();
};

// 5. 重力反转：反转下一次移动方向
GameManager.prototype.gravityReverse = function () {
  this.reverseDirection = true;
  this.addEvent("重力反转", "下一次移动方向反转");
  this.actuator.showEventMessage("重力反转！下一次移动方向将反转！", "negative");
  this.actuator.showReverseIcon();
};

// Add event to history
GameManager.prototype.addEvent = function (name, detail) {
  this.eventHistory.push({
    time: new Date().toLocaleTimeString(),
    name: name,
    detail: detail
  });
};
