  this.tileContainer    = document.querySelector(".tile-container");
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
    self.clearContainer(self.tileContainer);
    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
HTMLActuator.prototype.actuate = function (grid, metadata) {
        }
      });
  window.requestAnimationFrame(function () {

    self.updateScore(metadata.score);
    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

};

// Continues the game (both restart and keep playing)
        self.message(false); // You lose
  this.clearMessage();
        self.message(false); // You lose
      }
};

};
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.clearContainer = function (container) {

HTMLActuator.prototype.clearContainer = function (container) {

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  var self = this;

  this.applyClasses(wrapper, classes);
  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  inner.textContent = tile.value;
  var positionClass = this.positionClass(position);
  if (tile.previousPosition) {
  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];
    classes.push("tile-merged");
  if (tile.value > 2048) classes.push("tile-super");
};
    });
  } else {
  inner.classList.add("tile-inner");
    this.applyClasses(wrapper, classes);
  }
  // We can't use classlist because it somehow glitches when replacing classes
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position

  this.applyClasses(wrapper, classes);

  return "tile-position-" + position.x + "-" + position.y;

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {

    // Make sure that the tile gets rendered in the previous position first
  var wrapper   = document.createElement("div");
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
  var difference = score - this.score;
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };

  // Add the inner part of the tile to the wrapper


  // Put the tile on the board
    this.scoreContainer.appendChild(addition);
    this.applyClasses(wrapper, classes);
};
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
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
HTMLActuator.prototype.clearMessage = function () {
HTMLActuator.prototype.updateBestScore = function (bestScore) {
HTMLActuator.prototype.updateScore = function (score) {
};
