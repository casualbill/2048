function HTMLActuator(inputManager) {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.eventMessageContainer = document.querySelector(".event-message");
  this.freezeButtonsContainer = document.querySelector(".freeze-buttons-container");
  this.inputManager = inputManager;

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
        if (metadata.over) {
          self.message(false, metadata.eventHistory, metadata.gameDuration, metadata.leaderboard); // You lose
        } else if (metadata.won) {
          self.message(true, metadata.eventHistory, metadata.gameDuration, metadata.leaderboard); // You win!
        }
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

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", tile.value === 'X' ? "tile-poison" : "tile-" + tile.value, positionClass];

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
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
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

HTMLActuator.prototype.updateScore = function (score) {
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

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won, eventHistory, gameDuration, leaderboard) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  // Add game stats
  var stats = "<p>" + message + "</p>";
  if (gameDuration) {
    stats += "<p>游戏时长: " + gameDuration + "</p>";
  }
  if (eventHistory && eventHistory.length > 0) {
    stats += "<p>触发事件: " + eventHistory.length + " 次</p>";
    stats += "<h4>事件记录:</h4><ul>";
    eventHistory.forEach(function(event) {
      stats += "<li>" + event.time + " - " + event.name + ": " + event.detail + "</li>";
    });
    stats += "</ul>";
  }
  
  // Add leaderboard
  if (leaderboard && leaderboard.length > 0) {
    stats += "<h4>排行榜:</h4><ol>";
    leaderboard.forEach(function(entry, index) {
      var date = new Date(entry.date).toLocaleString();
      stats += "<li>#" + (index + 1) + " - 分数: " + entry.score + " (事件: " + entry.events + " 次, 时长: " + entry.duration + ", " + date + ")</li>";
    });
    stats += "</ol>";
  }

  this.messageContainer.classList.add(type);
  this.messageContainer.innerHTML = stats;
};

// Show event message
HTMLActuator.prototype.showEventMessage = function (message, type) {
  var self = this;
  this.eventMessageContainer.textContent = message;
  this.eventMessageContainer.className = "event-message event-" + type;
  this.eventMessageContainer.style.opacity = "1";
  
  setTimeout(function() {
    self.eventMessageContainer.style.opacity = "0";
  }, 3000);
};

// Flash tile with color
HTMLActuator.prototype.flashTile = function (tile, color) {
  var tileElement = this.tileContainer.querySelector(".tile-position-" + (tile.x + 1) + "-" + (tile.y + 1));
  if (tileElement) {
    tileElement.classList.add("flash-" + color);
    var self = this;
    setTimeout(function() {
      tileElement.classList.remove("flash-" + color);
    }, 1000);
  }
};

// Show freeze buttons
HTMLActuator.prototype.showFreezeButtons = function () {
  var self = this;
  this.clearContainer(this.freezeButtonsContainer);
  
  // Row buttons
  for (var i = 0; i < 4; i++) {
    var rowBtn = document.createElement("button");
    rowBtn.textContent = "冻结第" + (i + 1) + "行";
    rowBtn.dataset.type = "row";
    rowBtn.dataset.index = i;
    rowBtn.addEventListener("click", function(e) {
      self.inputManager.emit("freezeLine", {
        type: e.target.dataset.type,
        index: parseInt(e.target.dataset.index)
      });
      self.hideFreezeButtons();
    });
    this.freezeButtonsContainer.appendChild(rowBtn);
  }
  
  // Column buttons
  for (var i = 0; i < 4; i++) {
    var colBtn = document.createElement("button");
    colBtn.textContent = "冻结第" + (i + 1) + "列";
    colBtn.dataset.type = "col";
    colBtn.dataset.index = i;
    colBtn.addEventListener("click", function(e) {
      self.inputManager.emit("freezeLine", {
        type: e.target.dataset.type,
        index: parseInt(e.target.dataset.index)
      });
      self.hideFreezeButtons();
    });
    this.freezeButtonsContainer.appendChild(colBtn);
  }
  
  this.freezeButtonsContainer.style.display = "block";
};

// Hide freeze buttons
HTMLActuator.prototype.hideFreezeButtons = function () {
  this.freezeButtonsContainer.style.display = "none";
  this.clearContainer(this.freezeButtonsContainer);
  this.highlightFrozenLine(null);
};

// Highlight frozen line
HTMLActuator.prototype.highlightFrozenLine = function (lineData) {
  // Remove existing highlights
  var highlighted = document.querySelectorAll(".highlight-frozen");
  highlighted.forEach(function(el) {
    el.classList.remove("highlight-frozen");
  });
  
  if (!lineData) return;
  
  var gridCells = document.querySelectorAll(".grid-cell");
  gridCells.forEach(function(cell, index) {
    var x = index % 4;
    var y = Math.floor(index / 4);
    
    if ((lineData.type === 'row' && y === lineData.index) ||
        (lineData.type === 'col' && x === lineData.index)) {
      cell.classList.add("highlight-frozen");
    }
  });
};

// Show forbidden direction
HTMLActuator.prototype.showForbiddenDirection = function (direction) {
  var dirClass = ["forbid-up", "forbid-right", "forbid-down", "forbid-left"][direction];
  document.body.classList.add(dirClass);
  
  var self = this;
  setTimeout(function() {
    document.body.classList.remove(dirClass);
  }, 3000);
};

// Shake board when trying to move forbidden direction
HTMLActuator.prototype.shakeBoard = function () {
  document.querySelector(".game-container").classList.add("shake");
  var self = this;
  setTimeout(function() {
    document.querySelector(".game-container").classList.remove("shake");
  }, 500);
};

// Show reverse icon
HTMLActuator.prototype.showReverseIcon = function () {
  document.body.classList.add("reverse-active");
};

// Hide reverse icon
HTMLActuator.prototype.hideReverseIcon = function () {
  document.body.classList.remove("reverse-active");
};

// Show shield
HTMLActuator.prototype.showShield = function () {
  document.body.classList.add("shield-active");
};

// Hide shield
HTMLActuator.prototype.hideShield = function () {
  document.body.classList.remove("shield-active");
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
