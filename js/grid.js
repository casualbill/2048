function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
  this.blackHolePosition = previousState ? previousState.blackHolePosition : null;
  this.blackHoleTurns = previousState ? previousState.blackHoleTurns : 0;
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
  var cellState = state.cells || state;

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var tile = cellState[x][y];
      if (tile) {
        var newTile = new Tile(tile.position, tile.value);
        newTile.isFrozen = tile.isFrozen || false;
        newTile.freezeCountdown = tile.freezeCountdown || 0;
        row.push(newTile);
      } else {
        row.push(null);
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

// 设置黑洞位置
Grid.prototype.setBlackHole = function (position) {
  this.blackHolePosition = position;
  this.blackHoleTurns = 0;
};

// 检查是否是黑洞位置
Grid.prototype.isBlackHole = function (position) {
  if (!this.blackHolePosition) return false;
  return this.blackHolePosition.x === position.x && this.blackHolePosition.y === position.y;
};

// 增加黑洞回合数
Grid.prototype.incrementBlackHoleTurns = function () {
  this.blackHoleTurns++;
};

// 获取黑洞回合数
Grid.prototype.getBlackHoleTurns = function () {
  return this.blackHoleTurns;
};

// 移除黑洞
Grid.prototype.removeBlackHole = function () {
  this.blackHolePosition = null;
  this.blackHoleTurns = 0;
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
    cells: cellState,
    blackHolePosition: this.blackHolePosition,
    blackHoleTurns: this.blackHoleTurns
  };
};
