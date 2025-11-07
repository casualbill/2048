function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
}

// Build a grid of the specified size for hexagonal tiles
Grid.prototype.empty = function () {
  var cells = [];

  // Hexagonal grid: each row has size + Math.abs(y - Math.floor(size/2)) cells
  // This creates a hexagonal shape with the given size
  for (var y = 0; y < this.size; y++) {
    var row = cells[y] = [];
    var offset = Math.abs(y - Math.floor(this.size / 2));
    var rowSize = this.size + offset;
    
    for (var x = 0; x < rowSize; x++) {
      row.push(null);
    }
  }

  return cells;
};

Grid.prototype.fromState = function (state) {
  var cells = [];

  for (var y = 0; y < this.size; y++) {
    var row = cells[y] = [];
    var offset = Math.abs(y - Math.floor(this.size / 2));
    var rowSize = this.size + offset;
    
    for (var x = 0; x < rowSize; x++) {
      var tile = state[y][x];
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
  for (var y = 0; y < this.size; y++) {
    var row = this.cells[y];
    for (var x = 0; x < row.length; x++) {
      callback(x, y, row[x]);
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
  this.cells[tile.y][tile.x] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.y][tile.x] = null;
};

// Serialize the grid for storage
Grid.prototype.serialize = function () {
  var cellState = [];

  for (var y = 0; y < this.size; y++) {
    var row = this.cells[y];
    var rowState = [];
    for (var x = 0; x < row.length; x++) {
      rowState.push(row[x] ? row[x].serialize() : null);
    }
    cellState.push(rowState);
  }

  return {
    size: this.size,
    cells: cellState
  };
};

Grid.prototype.withinBounds = function (position) {
  if (position.y < 0 || position.y >= this.size) {
    return false;
  }
  var offset = Math.abs(position.y - Math.floor(this.size / 2));
  var rowSize = this.size + offset;
  return position.x >= 0 && position.x < rowSize;
};
