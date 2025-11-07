function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.gridContainer    = document.querySelector(".grid-container");
  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;
  
  // Clear the grid container and rebuild it for hexagonal layout
  this.clearContainer(this.gridContainer);
  this.gridContainer.className = "hex-grid-container";
  
  // Build hexagonal grid
  for (var y = 0; y < grid.size; y++) {
    var hexRow = document.createElement("div");
    hexRow.className = "hex-row";
    
    // Add offset for hexagonal shape
    var offset = Math.abs(y - Math.floor(grid.size / 2));
    for (var i = 0; i < offset; i++) {
      var emptyHex = document.createElement("div");
      emptyHex.className = "hex-cell empty";
      hexRow.appendChild(emptyHex);
    }
    
    var row = grid.cells[y];
    for (var x = 0; x < row.length; x++) {
      var hexCell = document.createElement("div");
      hexCell.className = "hex-cell";
      hexRow.appendChild(hexCell);
    }
    
    this.gridContainer.appendChild(hexRow);
  }
  
  // Clear and rebuild tiles
  this.clearContainer(this.tileContainer);
  
  grid.cells.forEach(function (column) {
    column.forEach(function (cell) {
      if (cell) {
        self.addTile(cell);
      }
    });
  });
  
  this.updateScore(metadata.score);
  this.updateBestScore(metadata.bestScore);
  
  if (metadata.terminated) {
    if (metadata.over) {
      this.message(false); // You lose
    } else if (metadata.won) {
      this.message(true); // You win!
    }
  }
};

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

HTMLActuator.prototype.addTile = function (tile) {
  var wrapper = document.createElement("div");
  var inner = document.createElement("div");
  
  var position = tile.previousPosition || tile.position;
  var positionClass = this.positionClass(position);
  
  // Create the tile element
  var classes = ["hex-tile", "hex-tile-" + tile.value, positionClass];
  this.applyClasses(wrapper, classes);
  
  inner.classList.add("hex-tile-inner");
  inner.textContent = tile.value;
  
  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);
  
  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
  
  // Handle animations
  if (tile.previousPosition) {
    // Tile moved from previous position
    var previousPositionClass = this.positionClass(tile.previousPosition);
    
    var positions = [previousPositionClass, positionClass];
    wrapper.classList.add("tile-moved");
    
    // Wait for the animation to complete
    setTimeout(function () {
      wrapper.classList.remove("tile-moved");
      wrapper.classList.remove.apply(wrapper.classList, positions);
      wrapper.classList.add(positionClass);
    }, 200);
  } else if (!tile.mergedFrom) {
    // New tile
    wrapper.classList.add("tile-new");
    setTimeout(function () {
      wrapper.classList.remove("tile-new");
    }, 200);
  } else {
    // Tile merged
    wrapper.classList.add("tile-merged");
    
    // Add the merged tiles
    tile.mergedFrom.forEach(function (mergedTile) {
      var mergedWrapper = document.createElement("div");
      var mergedInner = document.createElement("div");
      
      var mergedPosition = this.positionClass(mergedTile.position);
      var mergedClasses = ["hex-tile", "hex-tile-" + mergedTile.value, mergedPosition, "tile-merged"];
      
      this.applyClasses(mergedWrapper, mergedClasses);
      mergedInner.classList.add("hex-tile-inner");
      mergedInner.textContent = mergedTile.value;
      mergedWrapper.appendChild(mergedInner);
      
      this.tileContainer.appendChild(mergedWrapper);
      
      setTimeout(function () {
        this.tileContainer.removeChild(mergedWrapper);
      }.bind(this), 200);
    }.bind(this));
    
    setTimeout(function () {
      wrapper.classList.remove("tile-merged");
    }, 200);
  }
};

HTMLActuator.prototype.positionClass = function (position) {
  return "hex-tile-position-" + position.x + "-" + position.y;
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

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.message = function (won) {
  var type = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";
  
  var messageContainer = document.querySelector(".game-message");
  messageContainer.classList.add(type);
  messageContainer.getElementsByTagName("p")[0].textContent = message;
  messageContainer.style.display = "block";
};

HTMLActuator.prototype.continueGame = function () {
  var messageContainer = document.querySelector(".game-message");
  messageContainer.classList.remove("game-won", "game-over");
  messageContainer.style.display = "none";
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

      self.addTile(merged);
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};
