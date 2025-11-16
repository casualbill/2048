function Grid(size, shape, previousState) {
  this.size = size;
  this.shape = shape || 'square';
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

  // 根据形状初始化可用单元格
  this.initializeShape(cells);
  return cells;
};

// 根据形状初始化可用单元格
Grid.prototype.initializeShape = function(cells) {
  // 初始化穿墙模式（仅回字形支持）
  this.wallThroughMode = false;
  
  switch (this.shape) {
    case 'diamond':
      this.initializeDiamondShape(cells);
      break;
    case 'circle':
      this.initializeCircleShape(cells);
      break;
    case 'trapezoid':
      this.initializeTrapezoidShape(cells);
      break;
    case 'square-ring':
      this.initializeSquareRingShape(cells);
      break;
    // 默认方形
    default:
      break;
  }
};

// 初始化菱形形状 (1-2-3-4-3-2-1 分布)
Grid.prototype.initializeDiamondShape = function(cells) {
  var center = Math.floor(this.size / 2);
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      var distance = Math.abs(x - center) + Math.abs(y - center);
      if (distance > center) {
        cells[x][y] = 'blocked'; // 标记为不可用
      }
    }
  }
};

// 初始化圆形形状 (中心1格+内环8格+外环8格)
Grid.prototype.initializeCircleShape = function(cells) {
  var center = Math.floor(this.size / 2);
  
  // 定义圆形棋盘的可用位置
  var availablePositions = [
    {x: 2, y: 2}, // 中心
    // 内环
    {x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3},
    {x: 2, y: 1}, {x: 2, y: 3},
    {x: 3, y: 1}, {x: 3, y: 2}, {x: 3, y: 3},
    // 外环
    {x: 0, y: 2},
    {x: 1, y: 0}, {x: 1, y: 4},
    {x: 2, y: 0}, {x: 2, y: 4},
    {x: 3, y: 0}, {x: 3, y: 4},
    {x: 4, y: 2}
  ];
  
  // 先将所有单元格标记为不可用
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      cells[x][y] = 'blocked';
    }
  }
  
  // 再将可用位置标记为可用
  availablePositions.forEach(pos => {
    if (pos.x >= 0 && pos.x < this.size && pos.y >= 0 && pos.y < this.size) {
      cells[pos.x][pos.y] = null;
    }
  });
};

// 初始化梯形形状 (2-3-4-5-6 分布)
Grid.prototype.initializeTrapezoidShape = function(cells) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      if (y < (x + 1) || y > (this.size + x - 2)) {
        cells[x][y] = 'blocked'; // 标记为不可用
      }
    }
  }
};

// 初始化回字形形状 (5x5外框去除中心3x3)
Grid.prototype.initializeSquareRingShape = function(cells) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      if (x > 0 && x < this.size - 1 && y > 0 && y < this.size - 1) {
        cells[x][y] = 'blocked'; // 标记为不可用
      }
    }
  }
};

Grid.prototype.fromState = function (state) {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var tile = state[x][y];
      if (tile === 'blocked') {
        row.push('blocked');
      } else if (tile) {
        row.push(new Tile(tile.position, tile.value));
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
    if (tile === null) {
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
  return !this.cellOccupied(cell) && !this.cellBlocked(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  var content = this.cellContent(cell);
  return content !== null && content !== 'blocked';
};

Grid.prototype.cellBlocked = function (cell) {
  return this.cellContent(cell) === 'blocked';
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
      var cell = this.cells[x][y];
      row.push(cell && cell !== 'blocked' ? cell.serialize() : (cell === 'blocked' ? 'blocked' : null));
    }
  }

  return {
    size: this.size,
    shape: this.shape,
    cells: cellState
  };
};
