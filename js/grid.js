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
  var stateCells = state.cells || state;

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var tile = stateCells[x][y];
      if (tile) {
        // Log the tile object to debug
        console.log('Tile object:', tile);
        var position = null;
        
        // Check if tile has position with valid x and y
        if (tile.position) {
          if (typeof tile.position.x === 'number' && typeof tile.position.y === 'number') {
            position = tile.position;
          } else {
            console.log('Invalid position in tile:', tile.position);
          }
        }
        
        // If no valid position from tile.position, check tile.x and tile.y
        if (!position) {
          if (typeof tile.x === 'number' && typeof tile.y === 'number') {
            position = { x: tile.x, y: tile.y };
          } else {
            console.log('No valid position in tile (neither position nor x/y):', tile);
          }
        }
        
        // If we have a valid position, create Tile; else push null
        if (position && typeof position === 'object' && typeof position.x === 'number' && typeof position.y === 'number') {
          try {
            row.push(new Tile(position, tile.value));
          } catch (e) {
            console.log('Error creating Tile:', e);
            console.log('Position:', position);
            console.log('Tile:', tile);
            row.push(null);
          }
        } else {
          console.log('Skipping tile due to invalid position:', tile);
          row.push(null);
        }
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

Grid.prototype.serialize = function () {
  var cellState = [];

  for (var x = 0; x < this.size; x++) {
    var row = cellState[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
    }
  }

  return cellState;
};

// Check if any tiles have been merged
Grid.prototype.tilesMerged = function () {
  var merged = false;

  this.eachCell(function (x, y, tile) {
    if (tile && tile.mergedFrom) {
      merged = true;
    }
  });

  return merged;
};

// Find the highest tile value
Grid.prototype.highestValue = function () {
  var highest = 0;

  this.eachCell(function (x, y, tile) {
    if (tile && tile.value > highest) {
      highest = tile.value;
    }
  });

  return highest;
};