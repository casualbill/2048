function HTMLActuator(gameManager) {
  this.gameManager      = gameManager;
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    // Render hexagonal grid background
    const gridContainer = document.querySelector('.grid-container');
    self.clearContainer(gridContainer);
    
    // Calculate hexagonal grid dimensions
    const hexSize = 40;
    const centerOffset = (grid.size * 1.5 * hexSize) / 2;
    gridContainer.style.transform = `translate(${-centerOffset}px, ${-centerOffset}px)`;
    
    // Create grid cells
    grid.eachCell(function (q, r, s, tile) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      
      // Calculate hexagonal position
      const x = q * 1.5 * hexSize;
      const y = (r + q / 2) * Math.sqrt(3) * hexSize;
      cell.style.transform = `translate(${x}px, ${y}px)`;
      
      gridContainer.appendChild(cell);
    });

    // Render tiles
    grid.eachCell(function (q, r, s, tile) {
      if (tile) {
        self.addTile(tile);
      }
    });

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

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Clear and reposition tile container for hexagonal layout
  if (container === this.tileContainer) {
    const hexSize = 40;
    const centerOffset = (this.gameManager.size * 1.5 * hexSize) / 2;
    container.style.transform = `translate(${-centerOffset}px, ${-centerOffset}px)`;
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper = document.createElement("div");
  var inner = document.createElement("div");
  var position = tile.previousPosition || { q: tile.q, r: tile.r };
  var transform = this.getTransform(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);
  wrapper.style.transform = transform;

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      wrapper.style.transform = self.getTransform({ q: tile.q, r: tile.r });
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

HTMLActuator.prototype.getTransform = function (position) {
  // Calculate hexagonal position based on q and r coordinates
  const hexSize = 40; // Base size for hexagons
  const x = position.q * 1.5 * hexSize;
  const y = (position.r + position.q / 2) * Math.sqrt(3) * hexSize;
  return `translate(${x}px, ${y}px)`;
};

HTMLActuator.prototype.positionClass = function (position) {
  return "tile-position-" + position.q + "-" + position.r;
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
