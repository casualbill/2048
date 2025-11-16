  this.tileContainer    = document.querySelector(".tile-container");
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");

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
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(false); // You lose
      }
        self.message(true); // You win!

};
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.clearContainer = function (container) {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
HTMLActuator.prototype.addTile = function (tile) {
  }

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

  // We can't use classlist because it somehow glitches when replacing classes
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position

  this.applyClasses(wrapper, classes);

    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
    this.applyClasses(wrapper, classes);
    });

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
    this.applyClasses(wrapper, classes);

HTMLActuator.prototype.applyClasses = function (element, classes) {
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
HTMLActuator.prototype.normalizePosition = function (position) {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }
HTMLActuator.prototype.positionClass = function (position) {
  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
HTMLActuator.prototype.updateScore = function (score) {
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };



  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};


  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;
HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
    addition.textContent = "+" + difference;

  this.messageContainer.classList.add(type);
HTMLActuator.prototype.message = function (won) {
HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
