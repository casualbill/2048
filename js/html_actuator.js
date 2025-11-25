function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.gridContainer    = document.querySelector(".grid-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

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

    // Render black hole
    // Remove existing black hole
    const existingBlackHole = document.querySelector('.grid-cell-black-hole');
    if (existingBlackHole && existingBlackHole.parentNode) {
      existingBlackHole.parentNode.replaceChild(document.createElement('div'), existingBlackHole);
    }
    if (metadata.blackHoleActive && metadata.blackHolePosition) {
      self.renderBlackHole(metadata.blackHolePosition);
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

HTMLActuator.prototype.renderBlackHole = function (position) {
  // Remove existing black hole
  var existingBlackHole = document.querySelector(".grid-cell-black-hole");
  if (existingBlackHole) {
    existingBlackHole.remove();
  }
  
  // Create new black hole
  var blackHole = document.createElement("div");
  blackHole.classList.add("grid-cell");
  blackHole.classList.add("grid-cell-black-hole");
  
  // Find the correct grid row and cell to replace
  var gridRows = document.querySelectorAll(".grid-row");
  var targetRow = gridRows[position.y];
  if (!targetRow) return;
  
  var targetCell = targetRow.querySelectorAll(".grid-cell")[position.x];
  if (!targetCell) return;
  
  // Ensure blackHole is a valid DOM node
  if (!(blackHole instanceof Node)) return;
  
  // Replace the target cell with the black hole
  targetRow.replaceChild(blackHole, targetCell);
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
  if (tile.frozen) classes.push("tile-frozen");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.frozen) {
    // Add ice layer
    var iceLayer = document.createElement("div");
    iceLayer.classList.add("tile-ice-layer");
    
    // Add countdown number
    var countdown = document.createElement("div");
    countdown.classList.add("tile-countdown");
    countdown.textContent = tile.freezeCountdown;
    iceLayer.appendChild(countdown);
    
    wrapper.appendChild(iceLayer);
  }

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
