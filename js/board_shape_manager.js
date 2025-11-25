class BoardShapeManager {
  constructor() {
    this.shapes = {
      square: this.getSquareAvailableCells,
      diamond: this.getDiamondAvailableCells,
      circle: this.getCircleAvailableCells,
      trapezoid: this.getTrapezoidAvailableCells,
      donut: this.getDonutAvailableCells
    };
  }

  getAvailableCells(shape, size, config = {}) {
    if (this.shapes[shape]) {
      return this.shapes[shape](size, config);
    } else {
      return this.shapes.square(size);
    }
  }

  getSquareAvailableCells(size) {
    const cells = [];
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        cells.push({ x, y });
      }
    }
    return cells;
  }

  getDiamondAvailableCells(size) {
    const cells = [];
    const half = Math.floor(size / 2);
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (Math.abs(x - half) + Math.abs(y - half) <= half) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  getCircleAvailableCells(size) {
    const cells = [];
    const half = Math.floor(size / 2);
    const radius = half - 0.5;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const dx = x - half;
        const dy = y - half;
        if (dx * dx + dy * dy <= radius * radius) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  getTrapezoidAvailableCells(size, config) {
    const cells = [];
    const isInverted = config.inverted || false;
    const start = isInverted ? size - 1 : 0;
    const end = isInverted ? 0 : size - 1;
    const step = isInverted ? -1 : 1;
    for (let x = 0; x < size; x++) {
      const rowHeight = Math.floor((size - Math.abs(x - Math.floor(size / 2))) * 0.6);
      for (let y = 0; y < rowHeight; y++) {
        cells.push({ x, y });
      }
    }
    return cells;
  }

  getDonutAvailableCells(size) {
    const cells = [];
    const half = Math.floor(size / 2);
    const outerRadius = half - 0.5;
    const innerRadius = half - 2.5;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const dx = x - half;
        const dy = y - half;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= innerRadius * innerRadius && distanceSquared <= outerRadius * outerRadius) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }
}

// Export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BoardShapeManager;
}