function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.gridContainer    = document.querySelector(".grid-container");
  this.wallContainer    = document.createElement("div");
  this.wallContainer.className = "wall-container";
  this.gridContainer.appendChild(this.wallContainer);

  this.score = 0;
}

HTMLActuator.prototype.showModeSelection = function () {
  // Clear any existing messages
  this.clearMessage();
  this.clearContainer(this.tileContainer);
  
  // Create mode selection message
  var message = "Choose Game Mode";
  var classicButton = "Classic Mode";
  var mazeButton = "Maze Mode";
  
  this.messageContainer.classList.add("mode-selection");
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
  
  var lower = this.messageContainer.querySelector(".lower");
  lower.innerHTML = "";
  
  // Create classic mode button
  var classicButtonEl = document.createElement("a");
  classicButtonEl.className = "classic-mode-button button";
  classicButtonEl.textContent = classicButton;
  classicButtonEl.addEventListener("click", function () {
    window.dispatchEvent(new CustomEvent("selectMode", { detail: "classic" }));
  });
  lower.appendChild(classicButtonEl);
  
  // Create maze mode button
  var mazeButtonEl = document.createElement("a");
  mazeButtonEl.className = "maze-mode-button button";
  mazeButtonEl.textContent = mazeButton;
  mazeButtonEl.addEventListener("click", function () {
    window.dispatchEvent(new CustomEvent("selectMode", { detail: "maze" }));
  });
  lower.appendChild(mazeButtonEl);
  
  this.messageContainer.style.display = "block";
};

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);
    self.clearContainer(self.wallContainer);

    // Render tiles
    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    // Render walls for maze mode
    if (metadata.mode === 'maze' && grid.walls) {
      self.renderWalls(grid.walls);
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

// Render walls on the grid
HTMLActuator.prototype.renderWalls = function (walls) {
  var self = this;
  
  walls.forEach(function (wall) {
    var wallElement = document.createElement("div");
    wallElement.className = "wall wall-" + wall.type;
    
    // Calculate wall position and size
    var cellSize = 100 / self.gridSize();
    var wallWidth = cellSize * wall.length;
    var wallThickness = cellSize * 0.2; // 20% of cell size
    var x, y;
    
    if (wall.type === 'horizontal') {
      // Horizontal wall (between rows)
      x = wall.x * cellSize;
      y = (wall.y + 1) * cellSize - wallThickness / 2;
      wallElement.style.width = wallWidth + "%";
      wallElement.style.height = wallThickness + "%";
    } else {
      // Vertical wall (between columns)
      x = (wall.x + 1) * cellSize - wallThickness / 2;
      y = wall.y * cellSize;
      wallElement.style.width = wallThickness + "%";
      wallElement.style.height = wallWidth + "%";
    }
    
    // Set wall position
    wallElement.style.left = x + "%";
    wallElement.style.top = y + "%";
    
    self.wallContainer.appendChild(wallElement);
  });
};

// Get grid size
HTMLActuator.prototype.gridSize = function () {
  // For a 4x4 grid, return 4
  return 4;
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
  this.messageContainer.classList.remove("mode-selection");
};
