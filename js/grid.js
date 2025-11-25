function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
}

// Build a grid of the specified size
Grid.prototype.empty = function () {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var column = cells[x] = [];
    for (var y = 0; y < this.size; y++) {
      var row = column[y] = [];
      for (var z = 0; z < this.size; z++) {
        row.push(null);
      }
    }
  }

  return cells;
};

Grid.prototype.fromState = function (state) {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var column = cells[x] = [];
    for (var y = 0; y < this.size; y++) {
      var row = column[y] = [];
      for (var z = 0; z < this.size; z++) {
    var tile = state[x] && state[x][y] ? state[x][y][z] : null;
    row.push(tile ? new Tile(tile.position, tile.value) : null);
  }
    }
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

  this.eachCell(function (x, y, z, tile) {
    if (!tile) {
      cells.push({ x: x, y: y, z: z });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      for (var z = 0; z < this.size; z++) {
        callback(x, y, z, this.cells[x][y][z]);
      }
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y][cell.z];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y][tile.z] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y][tile.z] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size &&
         position.z >= 0 && position.z < this.size;
};

Grid.prototype.serialize = function () {
  var cellState = [];

  for (var x = 0; x < this.size; x++) {
    var column = cellState[x] = [];
    for (var y = 0; y < this.size; y++) {
      var row = column[y] = [];
      for (var z = 0; z < this.size; z++) {
        row.push(this.cells[x][y][z] ? this.cells[x][y][z].serialize() : null);
      }
    }
  }

  return {
    size: this.size,
    cells: cellState
  };
};
