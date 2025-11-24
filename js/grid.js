function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
}

// Build a grid of the specified size
Grid.prototype.empty = function () {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(null);
    }
  }

  return cells;
};

Grid.prototype.fromState = function (state) {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var tile = state[x][y];
      row.push(tile ? new Tile(tile.position, tile.value) : null);
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

  this.eachCell(function (x, y, tile) {
    if (!tile) {
      cells.push({ x: x, y: y });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
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
    return this.cells[cell.x][cell.y];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};

Grid.prototype.serialize = function () {
  var cellState = [];

  for (var x = 0; x < this.size; x++) {
    var row = cellState[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
    }
  }

  return {
    size: this.size,
    cells: cellState
  };
};

// Rotate the grid 90 degrees clockwise
Grid.prototype.rotateClockwise = function () {
  var newCells = [];
  for (var y = 0; y < this.size; y++) {
    var newRow = newCells[y] = [];
    for (var x = this.size - 1; x >= 0; x--) {
      var tile = this.cells[x][y];
      if (tile) {
        tile.x = y;
        tile.y = this.size - 1 - x;
      }
      newRow.push(tile);
    }
  }
  this.cells = newCells;
};

// Rotate the grid 90 degrees counterclockwise
Grid.prototype.rotateCounterclockwise = function () {
  var newCells = [];
  for (var y = this.size - 1; y >= 0; y--) {
    var newRow = newCells[y] = [];
    for (var x = 0; x < this.size; x++) {
      var tile = this.cells[x][y];
      if (tile) {
        tile.x = this.size - 1 - y;
        tile.y = x;
      }
      newRow.push(tile);
    }
  }
  this.cells = newCells;
};

// Rotate the grid 180 degrees
Grid.prototype.rotate180 = function () {
  var newCells = [];
  for (var x = this.size - 1; x >= 0; x--) {
    var newRow = newCells[x] = [];
    for (var y = this.size - 1; y >= 0; y--) {
      var tile = this.cells[x][y];
      if (tile) {
        tile.x = this.size - 1 - x;
        tile.y = this.size - 1 - y;
      }
      newRow.push(tile);
    }
  }
  this.cells = newCells;
};
