function MultiplayerManager() {
  this.mode = null; // 'timed' or 'infinite'
  this.timeLimit = 0; // in seconds
  this.timerInterval = null;
  this.timeRemaining = 0;
  this.player1 = new MultiplayerGameManager(4, null, null, LocalStorageManager, 'player-1');
  this.player2 = new MultiplayerGameManager(4, null, null, LocalStorageManager, 'player-2');
  this.gameStarted = false;
  this.winner = null;

  // Bind event listeners
  this.bindEventListeners();
}

MultiplayerManager.prototype.bindEventListeners = function() {
  var self = this;

  // Multiplayer mode button
  document.querySelector('.multiplayer-button').addEventListener('click', function() {
    document.querySelector('.above-game').style.display = 'none';
    document.querySelector('.multiplayer-selection').style.display = 'block';
    document.querySelector('.player-boards').style.display = 'none';
    document.querySelector('.game-explanation').style.display = 'none';
  });

  // Mode selection buttons
  document.querySelector('.timed-mode-button').addEventListener('click', function() {
    self.mode = 'timed';
    document.querySelector('.time-selection').style.display = 'block';
  });

  document.querySelector('.infinite-mode-button').addEventListener('click', function() {
    self.mode = 'infinite';
    self.startGame();
  });

  // Time selection buttons
  document.querySelectorAll('.time-option').forEach(function(button) {
    button.addEventListener('click', function() {
      self.timeLimit = parseInt(this.getAttribute('data-time')) * 60;
      self.startGame();
    });
  });

  // Restart button
  document.querySelector('.restart-button').addEventListener('click', function() {
    self.restartGame();
  });

  // Keep playing buttons
  document.querySelector('.player-1-keep-playing').addEventListener('click', function() {
    self.player1.keepPlaying = true;
    self.player1.actuator.continueGame();
  });

  document.querySelector('.player-2-keep-playing').addEventListener('click', function() {
    self.player2.keepPlaying = true;
    self.player2.actuator.continueGame();
  });

  // Retry buttons
  document.querySelector('.player-1-retry').addEventListener('click', function() {
    self.player1.restart();
  });

  document.querySelector('.player-2-retry').addEventListener('click', function() {
    self.player2.restart();
  });

  // Handle player input
  var inputManager = new MultiplayerKeyboardInputManager();
  inputManager.on('move', function(data) {
    if (self.gameStarted) {
      if (data.player === 1) {
        self.player1.move(data.direction);
      } else if (data.player === 2) {
        self.player2.move(data.direction);
      }
    }
  });

  inputManager.on('restart', function() {
    self.restartGame();
  });

  inputManager.on('keepPlaying', function() {
    // Not used in multiplayer mode
  });
};

MultiplayerManager.prototype.startGame = function() {
  var self = this;

  // Hide selection and show game boards
  document.querySelector('.multiplayer-selection').style.display = 'none';
  document.querySelector('.player-boards').style.display = 'flex';

  // Restart both players
  this.player1.restart();
  this.player2.restart();

  // Reset winner
  this.winner = null;
  document.getElementById('winner-message').style.display = 'none';

  // Start timer if timed mode
  if (this.mode === 'timed') {
    this.timeRemaining = this.timeLimit;
    this.updateTimer();
    document.querySelector('.timer-container').style.display = 'block';

    this.timerInterval = setInterval(function() {
      self.timeRemaining--;
      self.updateTimer();

      if (self.timeRemaining <= 0) {
        clearInterval(self.timerInterval);
        self.endGame();
      }
    }, 1000);
  } else {
    document.querySelector('.timer-container').style.display = 'none';
  }

  this.gameStarted = true;
};

MultiplayerManager.prototype.updateTimer = function() {
  var minutes = Math.floor(this.timeRemaining / 60);
  var seconds = this.timeRemaining % 60;
  document.getElementById('timer').textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
};

MultiplayerManager.prototype.endGame = function() {
  this.gameStarted = false;

  // Determine winner
  if (this.player1.won && !this.player2.won) {
    this.winner = 1;
  } else if (this.player2.won && !this.player1.won) {
    this.winner = 2;
  } else if (this.player1.score > this.player2.score) {
    this.winner = 1;
  } else if (this.player2.score > this.player1.score) {
    this.winner = 2;
  } else {
    // Tie
    document.getElementById('winner-text').textContent = 'It\'s a tie!';
    document.getElementById('winner-message').style.display = 'block';
    return;
  }

  // Show winner message
  document.getElementById('winner-text').textContent = 'Player ' + this.winner + ' wins!\nScore: ' + (this.winner === 1 ? this.player1.score : this.player2.score) + ' vs ' + (this.winner === 1 ? this.player2.score : this.player1.score);
  document.getElementById('winner-message').style.display = 'block';

  // Clear timer interval if running
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
  }
};

MultiplayerManager.prototype.restartGame = function() {
  this.gameStarted = false;
  clearInterval(this.timerInterval);
  document.querySelector('.multiplayer-selection').style.display = 'none';
  document.querySelector('.player-boards').style.display = 'none';
  document.querySelector('.timer-container').style.display = 'none';
  document.getElementById('winner-message').style.display = 'none';
  document.querySelector('.above-game').style.display = 'block';
  document.querySelector('.game-explanation').style.display = 'block';
};

// Override HTMLActuator to support player-specific elements
function MultiplayerHTMLActuator(playerId) {
  this.playerId = playerId;
  // Find player-specific containers
  this.tileContainer = document.querySelector('.player-' + playerId + '-tile-container');
  this.scoreContainer = document.querySelector('.player-' + playerId + '-score-container');
  this.messageContainer = document.querySelector('.player-' + playerId + '-message');
  this.score = 0;
}

// Inherit from HTMLActuator
MultiplayerHTMLActuator.prototype = Object.create(HTMLActuator.prototype);
MultiplayerHTMLActuator.prototype.constructor = MultiplayerHTMLActuator;

// Override the actuate method to use player-specific containers
MultiplayerHTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    // Clear player-specific tile container
    self.clearContainer(self.tileContainer);

    // Add tiles to player-specific container
    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    // Update player-specific score
    self.updateScore(metadata.score);

    // Show game messages in player-specific container
    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }
  });
};

// Override addTile to use player-specific container
MultiplayerHTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var element = document.createElement("div");
  var position = tile.previousPosition || { x: tile.x, y: tile.y };

  element.classList.add("tile", "tile-" + tile.value);
  this.positionElement(element, position);

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      element.classList.add("tile-moved");
      self.positionElement(element, { x: tile.x, y: tile.y });
    });
  } else if (tile.mergedFrom) {
    element.classList.add("tile-merged");
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    element.classList.add("tile-new");
  }

  // Add the tile to the player-specific container
  this.tileContainer.appendChild(element);
};

// Override clearContainer to use player-specific container
MultiplayerHTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

// Override positionElement (if needed)
MultiplayerHTMLActuator.prototype.positionElement = function (element, position) {
  var tileSize = this.tileSize();
  element.style.transform = "translate(" + (position.x * tileSize) + "px, " + (position.y * tileSize) + "px)";
};

// Override updateScore to use player-specific container
MultiplayerHTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

// Override message to use player-specific container
MultiplayerHTMLActuator.prototype.message = function (won) {
  var type = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  if (this.messageContainer) {
    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
  }
};

// Override continueGame to use player-specific container
MultiplayerHTMLActuator.prototype.continueGame = function () {
  if (this.messageContainer) {
    this.messageContainer.classList.remove("game-won", "game-over");
  }
};

// Override GameManager to support player-specific elements
function MultiplayerGameManager(size, InputManager, Actuator, StorageManager, playerId) {
  this.size           = size;
  this.storageManager = new StorageManager;
  this.actuator       = new MultiplayerHTMLActuator(playerId); // Use MultiplayerHTMLActuator
  this.playerId       = playerId;

  this.startTiles     = 2;

  this.setup();
}

// Copy GameManager prototype and modify as needed
MultiplayerGameManager.prototype = Object.create(GameManager.prototype);
MultiplayerGameManager.prototype.constructor = MultiplayerGameManager;

// Override move method to handle player-specific input
MultiplayerGameManager.prototype.move = function(direction) {
  var self = this;

  if (this.isGameTerminated()) return;

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  this.prepareTiles();

  traversals.x.forEach(function(x) {
    traversals.y.forEach(function(y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          tile.updatePosition(positions.next);

          self.score += merged.value;

          if (merged.value === 2048) {
            self.won = true;
            // Check if multiplayer game should end
            if (window.multiplayerManager && window.multiplayerManager.gameStarted) {
              window.multiplayerManager.endGame();
            }
          }
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
      // Check if multiplayer game should end
      if (window.multiplayerManager && window.multiplayerManager.gameStarted) {
        // Check if both players are over
        if (window.multiplayerManager.player1.over && window.multiplayerManager.player2.over) {
          window.multiplayerManager.endGame();
        }
      }
    }

    this.actuate();
  }
};

// Override HTMLActuator to support player-specific elements
function MultiplayerHTMLActuator(playerId) {
  this.playerId = playerId;
  this.tileContainer    = document.querySelector('.' + playerId + '-tiles');
  this.scoreContainer   = document.querySelector('.' + playerId + '-score');
  this.bestContainer    = document.querySelector('.' + playerId + '-best');
  this.messageContainer = document.querySelector('.' + playerId + '-message');

  this.score = 0;
}

// Copy HTMLActuator prototype
MultiplayerHTMLActuator.prototype = Object.create(HTMLActuator.prototype);
MultiplayerHTMLActuator.prototype.constructor = MultiplayerHTMLActuator;

// Override keep playing button binding
MultiplayerHTMLActuator.prototype.continueGame = function() {
  this.clearMessage();
};

// Override restart button binding
MultiplayerHTMLActuator.prototype.restart = function() {
  this.clearMessage();
};
