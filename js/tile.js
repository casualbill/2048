function Tile(position, value, isDynamic) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;
  this.isDynamic        = isDynamic || false;
  this.direction        = 1; // 1 for increasing, -1 for decreasing
  this.intervalId       = null;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together

  if (this.isDynamic) {
    this.startDynamicUpdate();
  }
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.startDynamicUpdate = function () {
  var self = this;
  this.intervalId = setInterval(function () {
    self.value += self.direction;
    // Ensure value stays within 1-10 range and reverse direction at boundaries
    if (self.value > 10) {
      self.value = 10;
      self.direction = -1;
    } else if (self.value < 1) {
      self.value = 1;
      self.direction = 1;
    }
    // Update the DOM to reflect the new value
    var tileElement = document.querySelector(".tile-position-" + (self.x + 1) + "-" + (self.y + 1) + " .tile-inner");
    if (tileElement) {
      tileElement.textContent = self.value;
    }
  }, 500);
};

Tile.prototype.stopDynamicUpdate = function () {
  if (this.intervalId) {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
};

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value,
    isDynamic: this.isDynamic
  };
};
