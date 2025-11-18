function HTMLActuator() {
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

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.actuateScore(metadata.score, metadata.bestScore);

    if (metadata.over) self.message("game-over");
    if (metadata.won && !metadata.keepPlaying) self.message("game-won");
  });
};

HTMLActuator.prototype.restart = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var element   = document.createElement("div");
  var position  = this.normalizePosition(tile.previousPosition || tile.position);
  var className = this.getClassName(tile.value);

  this.applyClasses(element, ["tile", className]);
  element.textContent = tile.value;

  if (tile.previousPosition) {
    window.requestAnimationFrame(function () {
      self.applyClasses(element, ["tile", className, "tile-merged"]);
    });
  } else if (tile.mergedFrom) {
    this.applyClasses(element, ["tile", className, "tile-merged"]);

    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    this.applyClasses(element, ["tile", className, "tile-new"]);
  }

  this.setPosition(element, position);
  this.tileContainer.appendChild(element);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.getClassName = function (value) {
  var prefix = "tile-";
  switch (value) {
    case 2: return prefix + "2";
    case 4: return prefix + "4";
    case 8: return prefix + "8";
    case 16: return prefix + "16";
    case 32: return prefix + "32";
    case 64: return prefix + "64";
    case 128: return prefix + "128";
    case 256: return prefix + "256";
    case 512: return prefix + "512";
    case 1024: return prefix + "1024";
    case 2048: return prefix + "2048";
    default: return prefix + "super";
  }
};

HTMLActuator.prototype.setPosition = function (element, position) {
  element.style.left = (position.x * 100) + "%";
  element.style.top  = (position.y * 100) + "%";
};

HTMLActuator.prototype.actuateScore = function (score, bestScore) {
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

  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (type, message) {
  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
