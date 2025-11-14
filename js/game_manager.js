function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.aiMode         = 'none'; // 'none', 'auto', 'suggest', 'assist'
  this.aiSpeed        = 'medium'; // 'fast', 'medium', 'slow'
  this.aiStats        = { highestScore: 0, averageScore: 0, gamesPlayed: 0, achieved2048: 0 };
  this.aiMoveCount    = 0;
  this.aiCurrentMove  = null;
  this.aiThinking     = false;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  // Set up AI mode event listeners
  this.setupAIControls();

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

// Set up AI control event listeners
GameManager.prototype.setupAIControls = function () {
  // AI mode buttons
  const aiAutoBtn = document.getElementById('ai-auto');
  const aiSuggestBtn = document.getElementById('ai-suggest');
  const aiAssistBtn = document.getElementById('ai-assist');
  
  if (aiAutoBtn) aiAutoBtn.addEventListener('click', () => this.setAIMode('auto'));
  if (aiSuggestBtn) aiSuggestBtn.addEventListener('click', () => this.setAIMode('suggest'));
  if (aiAssistBtn) aiAssistBtn.addEventListener('click', () => this.setAIMode('assist'));
  
  // AI speed buttons
  const aiSpeedFastBtn = document.getElementById('ai-speed-fast');
  const aiSpeedMediumBtn = document.getElementById('ai-speed-medium');
  const aiSpeedSlowBtn = document.getElementById('ai-speed-slow');
  
  if (aiSpeedFastBtn) aiSpeedFastBtn.addEventListener('click', () => this.setAISpeed('fast'));
  if (aiSpeedMediumBtn) aiSpeedMediumBtn.addEventListener('click', () => this.setAISpeed('medium'));
  if (aiSpeedSlowBtn) aiSpeedSlowBtn.addEventListener('click', () => this.setAISpeed('slow'));
};

// Set AI mode
GameManager.prototype.setAIMode = function (mode) {
  this.aiMode = mode;
  
  // Update button states
  document.querySelectorAll('.ai-mode-button').forEach(btn => btn.classList.remove('active'));
  if (mode !== 'none') {
    document.getElementById('ai-' + mode).classList.add('active');
  }
  
  // Start AI auto play if mode is auto
  if (mode === 'auto') {
    this.startAIAutoPlay();
  } else {
    this.stopAIAutoPlay();
  }
  
  console.log('AI mode set to:', mode);
};

// Set AI speed
GameManager.prototype.setAISpeed = function (speed) {
  this.aiSpeed = speed;
  
  // Update button states
  document.querySelectorAll('.ai-speed-button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('ai-speed-' + speed).classList.add('active');
  
  console.log('AI speed set to:', speed);
};

// Start AI auto play
GameManager.prototype.startAIAutoPlay = function () {
  if (this.isGameTerminated()) return;
  
  this.aiThinking = true;
  
  // Get AI move
  const board = this.grid.serialize().cells;
  const move = getAIMove(board);
  
  // Convert move to direction
  const direction = {
    'up': 0,
    'down': 1,
    'left': 2,
    'right': 3
  }[move] || 0;
  
  // Make the move
  const moved = this.move(direction);
  
  this.aiThinking = false;
  
  // If move was successful, continue auto play
  if (moved) {
    this.aiMoveCount++;
    
    // Calculate delay based on speed
    const delay = {
      'fast': 100,
      'medium': 500,
      'slow': 1000
    }[this.aiSpeed] || 500;
    
    setTimeout(() => this.startAIAutoPlay(), delay);
  }
};

// Stop AI auto play
GameManager.prototype.stopAIAutoPlay = function () {
  this.aiMode = 'none';
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

GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement directions
  var map = {
    0: { x: 0, y: -1 }, // up
    1: { x: 1, y: 0 },  // right
    2: { x: 0, y: 1 },  // down
    3: { x: -1, y: 0 }  // left
  };
  
  return map[direction];
};

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
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

