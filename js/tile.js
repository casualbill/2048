function Tile(position, value) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
  this.frozen           = false;
  this.freezeCountdown  = 0;
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
    frozen: this.frozen,
    freezeCountdown: this.freezeCountdown
  };
};

Tile.prototype.freeze = function () {
  this.frozen = true;
  this.freezeCountdown = 5;
};

Tile.prototype.unfreeze = function () {
  this.frozen = false;
  this.freezeCountdown = 0;
};

Tile.prototype.decrementFreezeCountdown = function () {
  if (this.frozen && this.freezeCountdown > 0) {
    this.freezeCountdown--;
    if (this.freezeCountdown === 0) {
      this.unfreeze();
    }
  }
};
