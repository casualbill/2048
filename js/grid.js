function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
}

// Build a hexagonal grid of the specified size (using axial coordinates)
Grid.prototype.empty = function () {
  var cells = new Map();

  for (var q = -this.size + 1; q < this.size; q++) {
    for (var r = -this.size + 1; r < this.size; r++) {
      var s = -q - r;
      if (Math.abs(s) < this.size) {
        cells.set(q + "," + r, null);
      }
    }
  }

  return cells;
};

Grid.prototype.fromState = function (state) {
  var cells = new Map();

  for (var key in state) {
    var tile = state[key];
    cells.set(key, tile ? new Tile(tile.position, tile.value) : null);
  }

  return cells;
};

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];

  this.eachCell(function (q, r, s, tile) {
    if (!tile) {
      cells.push({ q: q, r: r, s: s });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var [key, tile] of this.cells) {
    var [q, r] = key.split(",").map(Number);
    var s = -q - r;
    callback(q, r, s, tile);
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is available
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

// Check if the specified cell is taken
Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells.get(cell.q + "," + cell.r);
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells.set(tile.position.q + "," + tile.position.r, tile);
};

Grid.prototype.removeTile = function (tile) {
  this.cells.delete(tile.position.q + "," + tile.position.r);
};

Grid.prototype.withinBounds = function (position) {
  var s = -position.q - position.r;
  return Math.abs(position.q) < this.size &&
         Math.abs(position.r) < this.size &&
         Math.abs(s) < this.size;
};

Grid.prototype.serialize = function () {
  var cellState = {};

  this.eachCell(function (q, r, s, tile) {
    cellState[q + "," + r] = tile ? tile.serialize() : null;
  });

  return {
    size: this.size,
    cells: cellState
  };
};
