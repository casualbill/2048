function BoardShapeManager() {
  this.currentShape = 'square';
  this.shapeDefinitions = {
    square: {
      name: '标准方形',
      size: 4,
      availableCells: function(size) {
        size = size || 4;
        let cells = [];
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            cells.push({ x, y });
          }
        }
        return cells;
      },
      getNeighbors: function(cell, size) {
        size = size || 4;
        return [
          { x: cell.x, y: cell.y - 1 }, // up
          { x: cell.x + 1, y: cell.y }, // right
          { x: cell.x, y: cell.y + 1 }, // down
          { x: cell.x - 1, y: cell.y }  // left
        ].filter(neighbor => 
          neighbor.x >= 0 && neighbor.x < size && 
          neighbor.y >= 0 && neighbor.y < size
        );
      }
    },
    diamond: {
      name: '菱形',
      size: 7,
      availableCells: function(size) {
        size = size || 7;
        let cells = [];
        const half = Math.floor(size / 2);
        for (let y = 0; y < size; y++) {
          const offset = Math.abs(y - half);
          const startX = offset;
          const endX = size - offset - 1;
          for (let x = startX; x <= endX; x++) {
            cells.push({ x, y });
          }
        }
        return cells;
      },
      getNeighbors: function(cell, size) {
        size = size || 7;
        return [
          { x: cell.x, y: cell.y - 1 }, // up
          { x: cell.x + 1, y: cell.y }, // right
          { x: cell.x, y: cell.y + 1 }, // down
          { x: cell.x - 1, y: cell.y }  // left
        ].filter(neighbor => 
          neighbor.x >= 0 && neighbor.x < size && 
          neighbor.y >= 0 && neighbor.y < size && 
          Math.abs(neighbor.y - Math.floor(size / 2)) <= Math.floor(size / 2) - neighbor.x &&
          Math.abs(neighbor.y - Math.floor(size / 2)) <= Math.floor(size / 2) - (size - neighbor.x - 1)
        );
      }
    },
    circle: {
      name: '圆形',
      size: 5,
      availableCells: function(size) {
        size = size || 5;
        let cells = [];
        const center = Math.floor(size / 2);
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
            if (distance <= 2.5) { // Adjust for 5x5 grid
              cells.push({ x, y });
            }
          }
        }
        return cells;
      },
      getNeighbors: function(cell, size) {
        size = size || 5;
        return [
          { x: cell.x, y: cell.y - 1 }, // up
          { x: cell.x + 1, y: cell.y }, // right
          { x: cell.x, y: cell.y + 1 }, // down
          { x: cell.x - 1, y: cell.y }  // left
        ].filter(neighbor => 
          neighbor.x >= 0 && neighbor.x < size && 
          neighbor.y >= 0 && neighbor.y < size && 
          Math.sqrt(Math.pow(neighbor.x - Math.floor(size / 2), 2) + Math.pow(neighbor.y - Math.floor(size / 2), 2)) <= 2.5
        );
      }
    },
    trapezoid: {
      name: '梯形',
      size: 6,
      availableCells: function(size, inverted = false) {
        size = size || 6;
        let cells = [];
        let start = inverted ? size - 2 : 2;
        let step = inverted ? -1 : 1;
        for (let y = 0; y < size - 1; y++) {
          const cols = start + y * step;
          const offset = (size - cols) / 2;
          for (let x = offset; x < offset + cols; x++) {
            cells.push({ x, y });
          }
        }
        return cells;
      },
      getNeighbors: function(cell, size, inverted = false) {
        size = size || 6;
        return [
          { x: cell.x, y: cell.y - 1 }, // up
          { x: cell.x + 1, y: cell.y }, // right
          { x: cell.x, y: cell.y + 1 }, // down
          { x: cell.x - 1, y: cell.y }  // left
        ].filter(neighbor => 
          neighbor.x >= 0 && neighbor.x < size && 
          neighbor.y >= 0 && neighbor.y < size - 1 && 
          this.isCellAvailable(neighbor, size, inverted)
        );
      },
      isCellAvailable: function(cell, size, inverted = false) {
        size = size || 6;
        let start = inverted ? size - 2 : 2;
        let step = inverted ? -1 : 1;
        const cols = start + cell.y * step;
        const offset = (size - cols) / 2;
        return cell.x >= offset && cell.x < offset + cols;
      }
    },
    donut: {
      name: '回字形',
      size: 5,
      availableCells: function(size) {
        size = size || 5;
        let cells = [];
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
              cells.push({ x, y });
            }
          }
        }
        return cells;
      },
      getNeighbors: function(cell, size, wrapAround = false) {
        size = size || 5;
        if (!wrapAround) {
          return [
            { x: cell.x, y: cell.y - 1 }, // up
            { x: cell.x + 1, y: cell.y }, // right
            { x: cell.x, y: cell.y + 1 }, // down
            { x: cell.x - 1, y: cell.y }  // left
          ].filter(neighbor => 
            neighbor.x >= 0 && neighbor.x < size && 
            neighbor.y >= 0 && neighbor.y < size && 
            (neighbor.x === 0 || neighbor.x === size - 1 || neighbor.y === 0 || neighbor.y === size - 1)
          );
        } else {
          // Implement wrap-around for donut shape
          const neighbors = [];
          // Up
          if (cell.y > 0) {
            neighbors.push({ x: cell.x, y: cell.y - 1 });
          } else if (cell.x === 0 || cell.x === size - 1) {
            // Wrap to bottom
            neighbors.push({ x: cell.x, y: size - 1 });
          }
          // Right
          if (cell.x < size - 1) {
            neighbors.push({ x: cell.x + 1, y: cell.y });
          } else if (cell.y === 0 || cell.y === size - 1) {
            // Wrap to left
            neighbors.push({ x: 0, y: cell.y });
          }
          // Down
          if (cell.y < size - 1) {
            neighbors.push({ x: cell.x, y: cell.y + 1 });
          } else if (cell.x === 0 || cell.x === size - 1) {
            // Wrap to top
            neighbors.push({ x: cell.x, y: 0 });
          }
          // Left
          if (cell.x > 0) {
            neighbors.push({ x: cell.x - 1, y: cell.y });
          } else if (cell.y === 0 || cell.y === size - 1) {
            // Wrap to right
            neighbors.push({ x: size - 1, y: cell.y });
          }
          return neighbors;
        }
      }
    }
  };
}

BoardShapeManager.prototype.getShape = function(shapeName) {
  return this.shapeDefinitions[shapeName] || this.shapeDefinitions.square;
};

BoardShapeManager.prototype.getAvailableCells = function(shapeName, ...args) {
  const shape = this.getShape(shapeName);
  return shape.availableCells(...args);
};

BoardShapeManager.prototype.getNeighbors = function(shapeName, ...args) {
  const shape = this.getShape(shapeName);
  return shape.getNeighbors(...args);
};

// Export for Node.js compatibility (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BoardShapeManager;
}