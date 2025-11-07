function HTMLActuator() {
  this.tileContainers   = [
    document.querySelector(".player1 .tile-container"),
    document.querySelector(".player2 .tile-container")
  ];
  this.scoreContainers  = [
    document.querySelector(".player1 .score-container"),
    document.querySelector(".player2 .score-container")
  ];
  this.messageContainer = document.querySelector(".game-message");
  
  // Create score containers for multiplayer
  this.createMultiplayerScoreContainers();
  
  this.scores = [0, 0];
}

HTMLActuator.prototype.createMultiplayerScoreContainers = function() {
  // Add score containers for player 2
  var player1Score = document.querySelector(".player1 .score-container");
  if (!player1Score) {
    var player1Board = document.querySelector(".player1");
    var scoreContainer1 = document.createElement("div");
    scoreContainer1.className = "score-container player1-score";
    scoreContainer1.textContent = "0";
    player1Board.insertBefore(scoreContainer1, player1Board.querySelector(".grid-container"));
  }
  
  var player2Score = document.querySelector(".player2 .score-container");
  if (!player2Score) {
    var player2Board = document.querySelector(".player2");
    var scoreContainer2 = document.createElement("div");
    scoreContainer2.className = "score-container player2-score";
    scoreContainer2.textContent = "0";
    player2Board.insertBefore(scoreContainer2, player2Board.querySelector(".grid-container"));
  }
  
  // Update the score containers references
  this.scoreContainers = [
    document.querySelector(".player1 .score-container"),
    document.querySelector(".player2 .score-container")
  ];
};

HTMLActuator.prototype.actuate = function (players, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    if (metadata.multiplayer) {
      // Multiplayer mode
      for (var i = 0; i < 2; i++) {
        self.clearContainer(self.tileContainers[i]);
        
        players[i].grid.cells.forEach(function (column) {
          column.forEach(function (cell) {
            if (cell) {
              self.addTile(cell, i);
            }
          });
        });
        
        self.updateScore(players[i].score, i);
      }
      
      // Show timer if in timed mode
      if (metadata.gameMode === "timed") {
        self.updateTimer(metadata.timeRemaining);
      }
    } else {
      // Single player mode (backward compatibility)
      self.clearContainer(self.tileContainers[0]);
      
      players.cells.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell, 0);
          }
        });
      });
      
      self.updateScore(metadata.score, 0);
    }
  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile, playerIndex) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged, playerIndex);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the correct player's board
  this.tileContainers[playerIndex].appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score, playerIndex) {
  this.clearContainer(this.scoreContainers[playerIndex]);

  var difference = score - this.scores[playerIndex];
  this.scores[playerIndex] = score;

  this.scoreContainers[playerIndex].textContent = this.scores[playerIndex];

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainers[playerIndex].appendChild(addition);
  }
};

HTMLActuator.prototype.updateTimer = function(seconds) {
  var timerContainer = document.querySelector(".timer-container");
  if (!timerContainer) {
    timerContainer = document.createElement("div");
    timerContainer.className = "timer-container";
    var heading = document.querySelector(".heading");
    heading.parentNode.insertBefore(timerContainer, heading.nextSibling);
  }
  
  var minutes = Math.floor(seconds / 60);
  var secs = seconds % 60;
  timerContainer.textContent = "Time: " + minutes + ":" + (secs < 10 ? "0" : "") + secs;
};

HTMLActuator.prototype.message = function (message, players) {
  this.messageContainer.classList.add("game-won");
  
  var messageElement = this.messageContainer.getElementsByTagName("p")[0];
  messageElement.innerHTML = message + "<br>Player 1 Score: " + players[0].score + "<br>Player 2 Score: " + players[1].score;
  
  this.messageContainer.style.display = "block";
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
