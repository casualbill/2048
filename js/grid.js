function Grid(size, previousState, walls) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
  this.walls = walls || [];
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

Grid.prototype.hasHorizontalWall = function (x, y, direction) {
  for (var i = 0; i < this.walls.length; i++) {
    var wall = this.walls[i];
    if (wall.type === 'horizontal') {
      // 检查墙体是否阻挡了向上移动（方向为上时，墙体在当前单元格下方）
      if (direction === 'up' && wall.y === y + 1 && wall.x <= x && x < wall.x + wall.length) {
        return true;
      }
      // 检查墙体是否阻挡了向下移动（方向为下时，墙体在当前单元格上方）
      if (direction === 'down' && wall.y === y && wall.x <= x && x < wall.x + wall.length) {
        return true;
      }
    }
  }
  return false;
};

Grid.prototype.hasVerticalWall = function (x, y, direction) {
  for (var i = 0; i < this.walls.length; i++) {
    var wall = this.walls[i];
    if (wall.type === 'vertical') {
      // 检查墙体是否阻挡了向左移动（方向为左时，墙体在当前单元格右侧）
      if (direction === 'left' && wall.x === x + 1 && wall.y <= y && y < wall.y + wall.length) {
        return true;
      }
      // 检查墙体是否阻挡了向右移动（方向为右时，墙体在当前单元格左侧）
      if (direction === 'right' && wall.x === x && wall.y <= y && y < wall.y + wall.length) {
        return true;
      }
    }
  }
  return false;
};

Grid.prototype.hasWall = function (from, to) {
  var vector = { x: to.x - from.x, y: to.y - from.y };
  
  if (vector.x === 1) { // 向右移动
    return this.hasVerticalWall(from.x, from.y, 'right');
  } else if (vector.x === -1) { // 向左移动
    return this.hasVerticalWall(from.x, from.y, 'left');
  } else if (vector.y === 1) { // 向下移动
    return this.hasHorizontalWall(from.x, from.y, 'down');
  } else if (vector.y === -1) { // 向上移动
    return this.hasHorizontalWall(from.x, from.y, 'up');
  }
  return false;
};

Grid.prototype.addWall = function (wall) {
  this.walls.push(wall);
};

Grid.prototype.removeWall = function (wallIndex) {
  if (wallIndex >= 0 && wallIndex < this.walls.length) {
    this.walls.splice(wallIndex, 1);
  }
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
    walls: this.walls
  };
};
