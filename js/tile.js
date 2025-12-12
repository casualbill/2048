function Tile(position, value, isChanging) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;
  this.isChanging       = Boolean(isChanging);
  this.direction        = this.isChanging ? (Math.random() < 0.5 ? 1 : -1) : 0;
  
  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value,
    isChanging: this.isChanging,
    direction: this.direction
  };
};

// Update the value of the changing tile
Tile.prototype.updateValue = function () {
  if (!this.isChanging) return;
  
  this.value += this.direction;
  
  if (this.value <= 1 || this.value >= 10) {
    this.direction *= -1;
  }
};

// Check if the tile can be merged
Tile.prototype.canMerge = function (other) {
  if (!this.isChanging || !other.isChanging) {
    return this.value === other.value;
  }
  
  var canMerge = (this.value === 2 || this.value === 4 || this.value === 8);
  return canMerge && this.value === other.value;
};
