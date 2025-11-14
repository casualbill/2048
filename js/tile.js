function Tile(position, value) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
  
  // Animation properties
  this.appearStartTime  = null;
  this.mergeStartTime   = null;
  this.moveStartTime    = null;
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.resetAnimationState = function() {
  this.appearStartTime = null;
  this.mergeStartTime = null;
  this.moveStartTime = null;
};

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value
  };
};

Tile.prototype.deserialize = function (data) {
  this.x = data.position.x;
  this.y = data.position.y;
  this.value = data.value;
  
  this.previousPosition = null;
  this.mergedFrom = null;
  this.resetAnimationState();
};
