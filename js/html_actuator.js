function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.gridContainer    = document.querySelector(".grid-container");
  this.gameContainer    = document.querySelector(".game-container");

  this.score = 0;
  this.gridSize = 0; // Initialize gridSize
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    // Generate grid if not already done for this size
    console.log('Current grid size:', self.gridSize, 'New grid size:', grid.size);
    if (!self.gridSize || self.gridSize !== grid.size) {
      console.log('Calling generateGrid with size:', grid.size);
      self.generateGrid(grid.size);
    }
    
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
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

HTMLActuator.prototype.generateGrid = function (size) {  console.log('Generating grid with size:', size);
  // Add visual feedback for grid size change
  this.gridContainer.style.backgroundColor = `hsl(${size * 30}, 50%, 50%)`;
  // Remove existing grid size classes
  this.gridContainer.classList.forEach(cls => {
    if (cls.startsWith('grid-size-')) {
      this.gridContainer.classList.remove(cls);
    }
  });
  // Add new grid size class
  this.gridContainer.classList.add(`grid-size-${size}`);
  this.gridSize = size;
  this.clearContainer(this.gridContainer);

  // Calculate cell dimensions - total width is 500px, minus (size-1)*15px for margins
  const margin = 15; // Default margin
  const totalWidth = 500; // Keep total width fixed at 500px for consistent appearance
  const cellSize = (totalWidth - (size - 1) * margin) / size;
  
  // Update game container and grid container styles
  this.gameContainer.style.width = `${totalWidth}px`;
  this.gameContainer.style.height = `${totalWidth}px`;
  this.gridContainer.style.width = `${totalWidth}px`;
  this.gridContainer.style.height = `${totalWidth}px`;
  
  // Generate grid rows and cells
  for (let y = 0; y < size; y++) {
    const row = document.createElement('div');
    row.classList.add('grid-row');
    
    for (let x = 0; x < size; x++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.marginRight = x < size - 1 ? `${margin}px` : '0';
      
      row.appendChild(cell);
    }
    
    row.style.marginBottom = y < size - 1 ? `${margin}px` : '0';
    this.gridContainer.appendChild(row);
  }
  
  // Add CSS for tile positions and sizes
  this.addTilePositionStyles(size, cellSize, margin);
};

HTMLActuator.prototype.addTilePositionStyles = function (size, cellSize, margin) {
  let style = document.getElementById('tile-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'tile-styles';
    document.head.appendChild(style);
  }
  
  // Base tile styles
  const baseStyles = `
    .tile, .tile .tile-inner {
      width: ${cellSize}px;
      height: ${cellSize}px;
      line-height: ${cellSize}px;
      font-size: ${Math.max(20, cellSize * 0.4)}px;
    }
  `;
  
  // Generate position styles for each tile position
  let positionStyles = '';
  for (let x = 1; x <= size; x++) {
    for (let y = 1; y <= size; y++) {
      const left = (x - 1) * (cellSize + margin);
      const top = (y - 1) * (cellSize + margin);
      positionStyles += `
        .tile.tile-position-${x}-${y} {
          -webkit-transform: translate(${left}px, ${top}px);
          -moz-transform: translate(${left}px, ${top}px);
          -ms-transform: translate(${left}px, ${top}px);
          transform: translate(${left}px, ${top}px);
        }
      `;
    }
  }
  
  style.textContent = baseStyles + positionStyles;
  document.head.appendChild(style);
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
};
