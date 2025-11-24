function Tile(position, value) {
  this.q                = position.q;
  this.r                = position.r;
  this.s                = position.s;
  this.value            = value || 2;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { q: this.q, r: this.r, s: this.s };
};

Tile.prototype.updatePosition = function (position) {
  this.q = position.q;
  this.r = position.r;
  this.s = position.s;
};

Tile.prototype.serialize = function () {
  return {
    position: {
      q: this.q,
      r: this.r,
      s: this.s
    },
    value: this.value
  };
};
