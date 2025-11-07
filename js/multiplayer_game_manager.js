function MultiplayerGameManager(size, InputManager, Actuator, StorageManager) {
  this.size = size;
  this.inputManager = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator = new Actuator;
  
  // Two players
  this.players = [
    { grid: new Grid(size), score: 0, over: false, won: false, keepPlaying: false },
    { grid: new Grid(size), score: 0, over: false, won: false, keepPlaying: false }
  ];
  
  this.multiplayerMode = false;
  this.gameMode = "infinite"; // "timed" or "infinite"
  this.timeLimit = 0;
  this.timer = null;
  this.timeRemaining = 0;
  
  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  
  this.setup();
}

MultiplayerGameManager.prototype.setup = function() {
  // Add initial tiles for both players
  for (var i = 0; i < 2; i++) {
    this.addStartTiles(this.players[i]);
  }
  this.actuate();
};

MultiplayerGameManager.prototype.addStartTiles = function(player) {
  for (var i = 0; i < 2; i++) {
    this.addRandomTile(player);
  }
};

MultiplayerGameManager.prototype.addRandomTile = function(player) {
  if (player.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(player.grid.randomAvailableCell(), value);
    player.grid.insertTile(tile);
  }
};

MultiplayerGameManager.prototype.actuate = function() {
  this.actuator.actuate(this.players, {
    multiplayer: true,
    gameMode: this.gameMode,
    timeRemaining: this.timeRemaining
  });
};

MultiplayerGameManager.prototype.move = function(direction, playerIndex) {
  if (playerIndex === undefined) playerIndex = 1;
  playerIndex--;
  
  var player = this.players[playerIndex];
  if (player.over || (player.won && !player.keepPlaying)) return;
  
  var cell, tile;
  var vector = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved = false;
  
  this.prepareTiles(player.grid);
  
  var self = this;
  traversals.x.forEach(function(x) {
    traversals.y.forEach(function(y) {
      cell = { x: x, y: y };
      tile = player.grid.cellContent(cell);
      
      if (tile) {
        var positions = self.findFarthestPosition(player.grid, cell, vector);
        var next = player.grid.cellContent(positions.next);
        
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];
          
          player.grid.insertTile(merged);
          player.grid.removeTile(tile);
          
          tile.updatePosition(positions.next);
          
          player.score += merged.value;
          
          if (merged.value === 2048) {
            player.won = true;
            self.checkWinCondition();
          }
        } else {
          self.moveTile(player.grid, tile, positions.farthest);
        }
        
        if (!self.positionsEqual(cell, tile)) {
          moved = true;
        }
      }
    });
  });
  
  if (moved) {
    this.addRandomTile(player);
    
    if (!this.movesAvailable(player)) {
      player.over = true;
      this.checkGameOver();
    }
    
    this.actuate();
  }
};

MultiplayerGameManager.prototype.getVector = function(direction) {
  var map = {
    0: { x: 0, y: -1 }, // Up
    1: { x: 1, y: 0 },  // Right
    2: { x: 0, y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };
  return map[direction];
};

MultiplayerGameManager.prototype.buildTraversals = function(vector) {
  var traversals = { x: [], y: [] };
  
  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }
  
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
  
  return traversals;
};

MultiplayerGameManager.prototype.prepareTiles = function(grid) {
  grid.eachCell(function(x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

MultiplayerGameManager.prototype.findFarthestPosition = function(grid, cell, vector) {
  var previous;
  
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (grid.withinBounds(cell) && grid.cellAvailable(cell));
  
  return {
    farthest: previous,
    next: cell
  };
};

MultiplayerGameManager.prototype.moveTile = function(grid, tile, cell) {
  grid.cells[tile.x][tile.y] = null;
  grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

MultiplayerGameManager.prototype.movesAvailable = function(player) {
  return player.grid.cellsAvailable() || this.tileMatchesAvailable(player.grid);
};

MultiplayerGameManager.prototype.tileMatchesAvailable = function(grid) {
  var self = this;
  var tile;
  
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = grid.cellContent({ x: x, y: y });
      
      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell = { x: x + vector.x, y: y + vector.y };
          var other = grid.cellContent(cell);
          
          if (other && other.value === tile.value) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

MultiplayerGameManager.prototype.positionsEqual = function(first, second) {
  return first.x === second.x && first.y === second.y;
};

MultiplayerGameManager.prototype.checkWinCondition = function() {
  // Check if any player has won
  for (var i = 0; i < 2; i++) {
    if (this.players[i].won) {
      this.actuator.message("Player " + (i + 1) + " wins!", this.players);
      return;
    }
  }
};

MultiplayerGameManager.prototype.checkGameOver = function() {
  // Check if both players are over
  if (this.players[0].over && this.players[1].over) {
    // Determine winner based on score
    var winner = 1;
    if (this.players[1].score > this.players[0].score) {
      winner = 2;
    } else if (this.players[1].score === this.players[0].score) {
      this.actuator.message("It's a tie!", this.players);
      return;
    }
    this.actuator.message("Player " + winner + " wins with higher score!", this.players);
  }
};

MultiplayerGameManager.prototype.startTimedGame = function(timeLimit) {
  this.gameMode = "timed";
  this.timeLimit = timeLimit;
  this.timeRemaining = timeLimit;
  
  var self = this;
  this.timer = setInterval(function() {
    self.timeRemaining--;
    self.actuate();
    
    if (self.timeRemaining <= 0) {
      clearInterval(self.timer);
      self.timer = null;
      // Time's up, determine winner
      var winner = 1;
      if (self.players[1].score > self.players[0].score) {
        winner = 2;
      } else if (self.players[1].score === self.players[0].score) {
        self.actuator.message("Time's up! It's a tie!", self.players);
        return;
      }
      self.actuator.message("Time's up! Player " + winner + " wins!", self.players);
    }
  }, 1000);
};

MultiplayerGameManager.prototype.restart = function() {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
  
  for (var i = 0; i < 2; i++) {
    this.players[i] = {
      grid: new Grid(this.size),
      score: 0,
      over: false,
      won: false,
      keepPlaying: false
    };
    this.addStartTiles(this.players[i]);
  }
  
  this.timeRemaining = this.timeLimit;
  if (this.gameMode === "timed" && this.timeLimit > 0) {
    this.startTimedGame(this.timeLimit);
  }
  
  this.actuate();
};

MultiplayerGameManager.prototype.keepPlaying = function() {
  // This function would need to be implemented if we want to allow continuing after 2048 in multiplayer
};