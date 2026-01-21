function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
  this.walls = previousState && previousState.walls ? previousState.walls : [];
}

// Wall class for maze mode
function Wall(x, y, direction, length) {
  this.x = x;        // Starting position x (0-based index between cells)
  this.y = y;        // Starting position y (0-based index between cells)
  this.direction = direction;  // 'horizontal' or 'vertical'
  this.length = length;  // Length in cells (1-3)
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
      var tile = state.cells[x][y];
      row.push(tile ? new Tile(tile.position, tile.value) : null);
    }
  }

  // Load walls if present
  if (state.walls) {
    this.walls = state.walls.map(function(wallData) {
      return new Wall(wallData.x, wallData.y, wallData.direction, wallData.length);
    });
  } else {
    this.walls = [];
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

// Generate random walls for maze mode
Grid.prototype.generateWalls = function () {
  this.walls = [];
  var wallCount = Math.floor(Math.random() * 3) + 2; // 2-4 walls
  
  for (var i = 0; i < wallCount; i++) {
    var wall = this.generateRandomWall();
    this.walls.push(wall);
  }
  
  // Ensure all cells are connected
  while (!this.isGridConnected()) {
    this.removeRandomWall();
  }
};

// Generate a single random wall
Grid.prototype.generateRandomWall = function () {
  var direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
  var length = Math.floor(Math.random() * 3) + 1; // 1-3 cells
  
  if (direction === 'horizontal') {
    // Horizontal walls are between rows (y values)
    // Avoid border: x between 0 and size-2, y between 1 and size-2
    var x = Math.floor(Math.random() * (this.size - 1));
    var y = Math.floor(Math.random() * (this.size - 2)) + 1; // y starts at 1, ends at size-2
    // Ensure wall doesn't go beyond grid
    if (x + length > this.size - 1) {
      x = this.size - 1 - length;
    }
  } else {
    // Vertical walls are between columns (x values)
    // Avoid border: x between 1 and size-2, y between 0 and size-2
    var x = Math.floor(Math.random() * (this.size - 2)) + 1; // x starts at 1, ends at size-2
    var y = Math.floor(Math.random() * (this.size - 1));
    // Ensure wall doesn't go beyond grid
    if (y + length > this.size - 1) {
      y = this.size - 1 - length;
    }
  }
  
  return new Wall(x, y, direction, length);
};

// Check if there's a wall between two adjacent cells
Grid.prototype.hasWallBetween = function (cell1, cell2) {
  // Determine direction between cells
  var dx = cell2.x - cell1.x;
  var dy = cell2.y - cell1.y;
  
  if (dx === 0 && Math.abs(dy) === 1) {
    // Horizontal wall check (between rows)
    var wallX = Math.min(cell1.x, cell2.x);
    var wallY = Math.min(cell1.y, cell2.y);
    
    // Check all horizontal walls
    for (var i = 0; i < this.walls.length; i++) {
      var wall = this.walls[i];
      if (wall.direction === 'horizontal' && wall.y === wallY) {
        // Check if the wall covers the x position
        if (wallX >= wall.x && wallX < wall.x + wall.length) {
          return true;
        }
      }
    }
  } else if (dy === 0 && Math.abs(dx) === 1) {
    // Vertical wall check (between columns)
    var wallX = Math.min(cell1.x, cell2.x);
    var wallY = Math.min(cell1.y, cell2.y);
    
    // Check all vertical walls
    for (var i = 0; i < this.walls.length; i++) {
      var wall = this.walls[i];
      if (wall.direction === 'vertical' && wall.x === wallX) {
        // Check if the wall covers the y position
        if (wallY >= wall.y && wallY < wall.y + wall.length) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Check if a move is blocked by a wall
Grid.prototype.isMoveBlocked = function (from, to) {
  return this.hasWallBetween(from, to);
};

// Check if all cells are connected (no completely enclosed areas)
Grid.prototype.isGridConnected = function () {
  // Use BFS to check connectivity
  var visited = new Array(this.size);
  for (var i = 0; i < this.size; i++) {
    visited[i] = new Array(this.size).fill(false);
  }
  
  var queue = [{x: 0, y: 0}];
  visited[0][0] = true;
  var visitedCount = 1;
  
  var directions = [
    {x: 0, y: 1},  // down
    {x: 1, y: 0},  // right
    {x: 0, y: -1}, // up
    {x: -1, y: 0}  // left
  ];
  
  while (queue.length > 0) {
    var current = queue.shift();
    
    for (var i = 0; i < directions.length; i++) {
      var next = {
        x: current.x + directions[i].x,
        y: current.y + directions[i].y
      };
      
      if (this.withinBounds(next) && !visited[next.x][next.y]) {
        if (!this.hasWallBetween(current, next)) {
          visited[next.x][next.y] = true;
          visitedCount++;
          queue.push(next);
        }
      }
    }
  }
  
  // All cells should be visited if connected
  return visitedCount === this.size * this.size;
};

// Remove a random wall
Grid.prototype.removeRandomWall = function () {
  if (this.walls.length > 0) {
    var index = Math.floor(Math.random() * this.walls.length);
    this.walls.splice(index, 1);
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

  // Serialize walls
  var wallState = this.walls.map(function(wall) {
    return {
      x: wall.x,
      y: wall.y,
      direction: wall.direction,
      length: wall.length
    };
  });

  return {
    size: this.size,
    cells: cellState,
    walls: wallState
  };
};
