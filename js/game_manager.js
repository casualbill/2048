function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.gameMode       = "normal"; // Default to normal mode
  this.eventHistory   = [];
  this.eventCount     = 0;
  this.gameStartTime  = null;
  this.luckyShield    = false;
  this.forbiddenDirection = null;
  this.invertDirection = false;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  // Get game mode from dropdown
  var gameModeSelector = document.getElementById('game-mode');
  if (gameModeSelector) {
    this.gameMode = gameModeSelector.value;
    gameModeSelector.addEventListener('change', (e) => {
      this.gameMode = e.target.value;
    });
  }

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
  this.isKeepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.isKeepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reset game-specific variables
  this.eventHistory = [];
  this.eventCount = 0;
  this.gameStartTime = Date.now();
  this.luckyShield = false;
  this.forbiddenDirection = null;
  this.invertDirection = false;

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.isKeepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.isKeepPlaying   = false;

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
  if (this.forbiddenDirection === direction) {
    // Vibrate the game container to show forbidden direction
    var container = document.querySelector('.game-container');
    container.style.transform = 'translateX(5px)';
    setTimeout(function () {
      container.style.transform = 'translateX(-5px)';
      setTimeout(function () {
        container.style.transform = '';
      }, 100);
    }, 100);
    return;
  }
  
  // Invert direction if gravity is flipped
  if (this.invertDirection) {
    direction = (direction + 2) % 4;
    this.invertDirection = false; // Reset after one move
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
        // Skip if tile is in a frozen row or column
        if (self.frozenElement) {
          if ((self.frozenElement.type === 'row' && self.frozenElement.index === y) ||
              (self.frozenElement.type === 'col' && self.frozenElement.index === x)) {
            return;
          }
        }
        
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom && next.value !== 'X' && tile.value !== 'X') {
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
      this.saveToLeaderboard(); // Save to leaderboard when game over
    }

    this.actuate();
    
    // Check if we should trigger an event
    if ((this.gameMode === 'event' || this.gameMode === 'doom') && Math.random() < 0.15) {
      this.triggerRandomEvent();
    }
    
    // Reset forbidden direction
    this.forbiddenDirection = null;
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

// Trigger a random event based on game mode
GameManager.prototype.triggerRandomEvent = function () {
  this.eventCount++;
  var isPositive = (this.gameMode === 'event' && Math.random() < 0.6) || 
                   (this.gameMode === 'doom' && Math.random() < 0.2);
  
  if (isPositive) {
    this.triggerPositiveEvent();
  } else {
    if (this.luckyShield) {
      // Use lucky shield to cancel negative event
      this.luckyShield = false;
      this.showEventMessage("幸运护盾生效，抵消负面事件");
      return;
    }
    this.triggerNegativeEvent();
  }
};

// Trigger a random positive event
GameManager.prototype.triggerPositiveEvent = function () {
  var events = [
    'luckyDouble', 'refreshReward', 'freezeRowCol', 
    'smartMerge', 'luckyShield'
  ];
  var event = events[Math.floor(Math.random() * events.length)];
  
  this[event]();
  this.eventHistory.push({ type: 'positive', name: event, time: new Date() });
};

// Trigger a random negative event
GameManager.prototype.triggerNegativeEvent = function () {
  var events = [
    'poisonTile', 'backward', 'forbidDirection', 
    'confuseNumbers', 'invertGravity'
  ];
  var event = events[Math.floor(Math.random() * events.length)];
  
  this[event]();
  this.eventHistory.push({ type: 'negative', name: event, time: new Date() });
};

// Display event message
GameManager.prototype.showEventMessage = function (message) {
  var container = document.querySelector('.event-message-container');
  if (!container) return;
  
  container.textContent = message;
  container.style.display = 'block';
  container.style.padding = '10px';
  container.style.textAlign = 'center';
  container.style.fontSize = '20px';
  container.style.fontWeight = 'bold';
  container.style.color = '#333';
  
  setTimeout(function () {
    container.textContent = '';
    container.style.display = 'none';
  }, 3000);
};

// 正面事件：幸运倍增
GameManager.prototype.luckyDouble = function () {
  var tiles = [];
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length === 0) return;
  var tile = tiles[Math.floor(Math.random() * tiles.length)];
  tile.value *= 2;
  
  // Add visual effect
  this.actuator.addEffect(tile, 'golden-flash');
  this.showEventMessage('幸运倍增！');
};

// 正面事件：刷新奖励
GameManager.prototype.refreshReward = function () {
  if (!this.grid.cellsAvailable()) return;
  
  var value;
  var rand = Math.random();
  if (rand < 0.5) value = 8;
  else if (rand < 0.8) value = 16;
  else if (rand < 0.95) value = 32;
  else value = 64;
  
  var tile = new Tile(this.grid.randomAvailableCell(), value);
  this.grid.insertTile(tile);
  
  // Add visual effect
  this.actuator.addEffect(tile, 'flash');
  this.showEventMessage('刷新奖励！');
};

// 正面事件：冻结行列
GameManager.prototype.freezeRowCol = function () {
  var container = document.querySelector('.game-container');
  var freezeContainer = document.createElement('div');
  freezeContainer.classList.add('freeze-container');
  freezeContainer.style.position = 'absolute';
  freezeContainer.style.top = '0';
  freezeContainer.style.left = '0';
  freezeContainer.style.width = '100%';
  freezeContainer.style.height = '100%';
  freezeContainer.style.background = 'rgba(0, 0, 0, 0.5)';
  freezeContainer.style.display = 'flex';
  freezeContainer.style.flexDirection = 'column';
  freezeContainer.style.justifyContent = 'center';
  freezeContainer.style.alignItems = 'center';
  freezeContainer.style.zIndex = '100';
  
  var title = document.createElement('h3');
  title.textContent = '请选择要冻结的行或列：';
  title.style.color = 'white';
  title.style.marginBottom = '20px';
  freezeContainer.appendChild(title);
  
  // Create row buttons
  var rowButtons = document.createElement('div');
  rowButtons.style.marginBottom = '10px';
  for (var i = 0; i < 4; i++) {
    var btn = document.createElement('button');
    btn.textContent = '第' + (i + 1) + '行';
    btn.style.padding = '10px 20px';
    btn.style.margin = '0 5px';
    btn.style.fontSize = '16px';
    btn.dataset.type = 'row';
    btn.dataset.index = i;
    rowButtons.appendChild(btn);
  }
  freezeContainer.appendChild(rowButtons);
  
  // Create column buttons
  var colButtons = document.createElement('div');
  for (var i = 0; i < 4; i++) {
    var btn = document.createElement('button');
    btn.textContent = '第' + (i + 1) + '列';
    btn.style.padding = '10px 20px';
    btn.style.margin = '0 5px';
    btn.style.fontSize = '16px';
    btn.dataset.type = 'col';
    btn.dataset.index = i;
    colButtons.appendChild(btn);
  }
  freezeContainer.appendChild(colButtons);
  
  container.appendChild(freezeContainer);
  
  // Add event listeners
  var self = this;
  var buttons = freezeContainer.querySelectorAll('button');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      self.freezeElement(btn.dataset.type, parseInt(btn.dataset.index));
      freezeContainer.remove();
      self.showEventMessage('已冻结' + btn.textContent + '！');
    });
  });
  
  // Auto-cancel after 10 seconds
  setTimeout(function () {
    if (freezeContainer.parentNode) {
      freezeContainer.remove();
      self.showEventMessage('冻结行列超时取消！');
    }
  }, 10000);
};

// Freeze a row or column
GameManager.prototype.freezeElement = function (type, index) {
  this.frozenElement = { type: type, index: index, time: Date.now() };
  
  // Add visual effect
  var gridContainer = document.querySelector('.tile-container');
  var frozenClass = 'frozen-' + type + '-' + (index + 1);
  gridContainer.classList.add(frozenClass);
  
  // Reset after next move
  var self = this;
  setTimeout(function () {
    self.frozenElement = null;
    gridContainer.classList.remove(frozenClass);
  }, 10000);
};

// 正面事件：智能合并
GameManager.prototype.smartMerge = function () {
  var tiles = [];
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length < 2) return;
  
  // Sort tiles by value descending
  tiles.sort(function (a, b) {
    return b.value - a.value;
  });
  
  // Find the first pair of tiles with the same value
  var mergeTiles = null;
  for (var i = 0; i < tiles.length - 1; i++) {
    for (var j = i + 1; j < tiles.length; j++) {
      if (tiles[i].value === tiles[j].value) {
        mergeTiles = [tiles[i], tiles[j]];
        break;
      }
    }
    if (mergeTiles) break;
  }
  
  if (!mergeTiles) return;
  
  // Merge the two tiles
  var tile1 = mergeTiles[0];
  var tile2 = mergeTiles[1];
  
  // Move both tiles to the middle position
  var newX = Math.floor((tile1.x + tile2.x) / 2);
  var newY = Math.floor((tile1.y + tile2.y) / 2);
  
  // Update tile positions
  tile1.updatePosition({ x: newX, y: newY });
  tile2.updatePosition({ x: newX, y: newY });
  
  // Remove both tiles from grid
  this.grid.removeTile(tile1);
  this.grid.removeTile(tile2);
  
  // Create merged tile
  var mergedTile = new Tile({ x: newX, y: newY }, tile1.value * 2);
  mergedTile.mergedFrom = [tile1, tile2];
  this.grid.insertTile(mergedTile);
  
  // Update score
  this.score += mergedTile.value;
  
  // Add visual effects
  this.actuator.addEffect(tile1, 'move');
  this.actuator.addEffect(tile2, 'move');
  this.actuator.addEffect(mergedTile, 'merge');
  
  // Check if we won
  if (mergedTile.value === 2048) this.won = true;
  
  this.showEventMessage('智能合并！');
  this.actuate();
};

// 正面事件：幸运护盾
GameManager.prototype.luckyShield = function () {
  this.luckyShield = true;
  
  // Add visual effect
  var container = document.querySelector('.game-container');
  container.style.boxShadow = '0 0 20px gold';
  setTimeout(function () {
    container.style.boxShadow = '';
  }, 5000);
  
  this.showEventMessage('获得幸运护盾！');
};

// 负面事件：毒方块
GameManager.prototype.poisonTile = function () {
  if (!this.grid.cellsAvailable()) return;
  
  var tile = new Tile(this.grid.randomAvailableCell(), 'X');
  this.grid.insertTile(tile);
  
  // Add visual effect
  this.actuator.addEffect(tile, 'poison');
  this.showEventMessage('生成毒方块！');
};

// 负面事件：数字倒退
GameManager.prototype.backward = function () {
  var tiles = [];
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length === 0) return;
  var tile = tiles[Math.floor(Math.random() * tiles.length)];
  tile.value = Math.max(2, Math.floor(tile.value / 2));
  
  // Add visual effect
  this.actuator.addEffect(tile, 'red-flash');
  this.showEventMessage('数字倒退！');
};

// 负面事件：随机禁操作
GameManager.prototype.forbidDirection = function () {
  this.forbiddenDirection = Math.floor(Math.random() * 4);
  var directions = ['上', '右', '下', '左'];
  
  // Add visual effect
  this.actuator.showForbiddenDirection(this.forbiddenDirection);
  this.showEventMessage('禁止向' + directions[this.forbiddenDirection] + '移动！');
  
  // Reset after next move
  var self = this;
  setTimeout(function () {
    self.forbiddenDirection = null;
  }, 10000);
};

// 负面事件：数字混乱
GameManager.prototype.confuseNumbers = function () {
  var tiles = [];
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value !== 'X') tiles.push(tile);
  });
  
  if (tiles.length < 2) return;
  
  // Find two tiles with the largest value difference
  var maxDiff = 0;
  var selectedTiles = [tiles[0], tiles[1]];
  
  for (var i = 0; i < tiles.length; i++) {
    for (var j = i + 1; j < tiles.length; j++) {
      var diff = Math.abs(tiles[i].value - tiles[j].value);
      if (diff > maxDiff) {
        maxDiff = diff;
        selectedTiles = [tiles[i], tiles[j]];
      }
    }
  }
  
  if (!selectedTiles || selectedTiles.length < 2) return;
  
  // Swap their positions
  var tile1 = selectedTiles[0];
  var tile2 = selectedTiles[1];
  
  var tempX = tile1.x;
  var tempY = tile1.y;
  
  tile1.updatePosition({ x: tile2.x, y: tile2.y });
  tile2.updatePosition({ x: tempX, y: tempY });
  
  // Update grid
  this.grid.removeTile(tile1);
  this.grid.removeTile(tile2);
  
  this.grid.insertTile(tile1);
  this.grid.insertTile(tile2);
  
  // Add visual effects
  this.actuator.addEffect(tile1, 'swap');
  this.actuator.addEffect(tile2, 'swap');
  
  this.showEventMessage('数字混乱！');
  this.actuate();
}

// 负面事件：重力翻转
GameManager.prototype.invertGravity = function () {
  this.invertDirection = true;
  
  // Add visual effect
  this.actuator.showInvertedDirection();
  this.showEventMessage('重力翻转！');
};

// Save game result to leaderboard
GameManager.prototype.saveToLeaderboard = function () {
  var gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
  var leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  
  leaderboard.push({
    score: this.score,
    eventCount: this.eventCount,
    duration: gameDuration,
    date: new Date().toISOString(),
    mode: this.gameMode
  });
  
  // Keep top 10 entries
  leaderboard.sort(function (a, b) {
    return b.score - a.score;
  });
  if (leaderboard.length > 10) leaderboard = leaderboard.slice(0, 10);
  
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
};
