function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.wallContainer    = document.querySelector(".wall-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.modeContainer    = document.querySelector(".mode-container");

  this.score = 0;
  this.currentMode = 'classic';
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

    // Update mode display
    self.updateMode(metadata.mode);

    // Draw walls if in maze mode
    if (metadata.mode === 'maze') {
      self.drawWalls(grid.size, metadata.walls);
    } else {
      self.clearContainer(self.wallContainer);
    }

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

// Update mode display
HTMLActuator.prototype.updateMode = function (mode) {
  if (mode !== this.currentMode) {
    this.currentMode = mode;
    // Update mode display in the UI
    if (this.modeContainer) {
      this.modeContainer.textContent = mode === 'maze' ? '迷宫模式' : '经典模式';
    }
  }
};

// Draw walls on the board
HTMLActuator.prototype.drawWalls = function (size, walls) {
  this.clearContainer(this.wallContainer);
  
  var cellSize = 107; // Size of each cell in pixels (matches CSS)
  var cellSpacing = 14; // Spacing between cells (121px - 107px)
  var wallThickness = 12; // Thickness of walls
  
  walls.forEach(function (wall) {
    var wallElement = document.createElement('div');
    var x = wall.x * (cellSize + cellSpacing);
    var y = wall.y * (cellSize + cellSpacing);
    
    if (wall.isHorizontal) {
      // Horizontal wall: between rows y and y+1
      wallElement.classList.add('wall', 'wall-horizontal');
      wallElement.style.width = (wall.length * (cellSize + cellSpacing) - cellSpacing) + 'px';
      wallElement.style.height = wallThickness + 'px';
      wallElement.style.left = x + 'px';
      wallElement.style.top = (y + cellSize + (cellSpacing - wallThickness) / 2) + 'px';
    } else {
      // Vertical wall: between columns x and x+1
      wallElement.classList.add('wall', 'wall-vertical');
      wallElement.style.width = wallThickness + 'px';
      wallElement.style.height = (wall.length * (cellSize + cellSpacing) - cellSpacing) + 'px';
      wallElement.style.left = (x + cellSize + (cellSpacing - wallThickness) / 2) + 'px';
      wallElement.style.top = y + 'px';
    }
    
    this.wallContainer.appendChild(wallElement);
  }, this);
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

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
