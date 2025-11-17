function Tile(position, value, isEnergy, isGravityCore) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;
  this.isEnergy         = isEnergy || false;
  this.isGravityCore    = isGravityCore || false;
  this.gravityStrength  = isGravityCore ? 1 : 0;

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
    isEnergy: this.isEnergy,
    isGravityCore: this.isGravityCore,
    gravityStrength: this.gravityStrength
  };
};
