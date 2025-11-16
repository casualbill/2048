this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  
  // 创建倒计时显示元素
  this.mergeTimerContainer = document.createElement("div");
  this.mergeTimerContainer.className = "merge-timer-container";
  this.mergeTimerContainer.style.cssText = "text-align: center; font-size: 24px; font-weight: bold; color: #f65e3b; margin-bottom: 10px;";
  document.querySelector(".game-container").insertBefore(this.mergeTimerContainer, document.querySelector(".score-container"));

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
    
    // 更新合并倒计时显示
    if (metadata.mergeTimerActive) {
      var remainingTime = Math.ceil((metadata.mergeTimerDuration - (Date.now() - metadata.mergeTimerStartTime)) / 1000);
      self.mergeTimerContainer.textContent = "倒计时: " + remainingTime + "秒";
      self.mergeTimerContainer.style.display = "block";
    } else {
      self.mergeTimerContainer.style.display = "none";
    }

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.clearContainer = function (container) {
      }
    }

  });
};
};
  }

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");
  // 炸弹特殊样式
  if (tile.isBomb) {
    classes.push("tile-bomb");
  }
};
  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  // We can't use classlist because it somehow glitches when replacing classes
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position

  this.applyClasses(wrapper, classes);

    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {

    // Make sure that the tile gets rendered in the previous position first
  var wrapper   = document.createElement("div");
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
    this.applyClasses(wrapper, classes);
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
    this.applyClasses(wrapper, classes);

HTMLActuator.prototype.applyClasses = function (element, classes) {
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");
HTMLActuator.prototype.normalizePosition = function (position) {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);

HTMLActuator.prototype.positionClass = function (position) {
  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
HTMLActuator.prototype.updateScore = function (score) {
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");



  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};
HTMLActuator.prototype.updateBestScore = function (bestScore) {
HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";

  this.scoreContainer.textContent = this.score;
  this.messageContainer.classList.add(type);
HTMLActuator.prototype.message = function (won) {
HTMLActuator.prototype.updateBestScore = function (bestScore) {
    addition.classList.add("score-addition");
HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");

  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
  // IE only takes one value to remove at a time.
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
