window.MapEditor = function MapEditor(gameManager) {
  this.gameManager = gameManager;
  this.container = document.querySelector('.editor-container');
  this.gridContainer = document.querySelector('.editor-grid-container');
  this.sizeSelect = document.getElementById('size-select');
  this.brushMode = document.getElementById('brush-mode');
  this.saveMapBtn = document.getElementById('save-map-btn');
  this.closeEditorBtn = document.getElementById('close-editor-btn');
  this.validationMessage = document.getElementById('validation-message');
  
  this.currentSize = 4;
  this.grid = [];
  this.isMouseDown = false;
  
  // Initialize event listeners
  this.sizeSelect.addEventListener('change', this.handleSizeChange.bind(this));
  this.saveMapBtn.addEventListener('click', this.saveMap.bind(this));
  this.closeEditorBtn.addEventListener('click', this.close.bind(this));
  
  // Initialize with default size
  this.createGrid();
}

MapEditor.prototype.open = function() {
  this.container.style.display = 'block';
};

MapEditor.prototype.close = function() {
  this.container.style.display = 'none';
};

MapEditor.prototype.createGrid = function() {
  this.currentSize = parseInt(this.sizeSelect.value);
  this.grid = [];
  
  // Clear existing grid
  this.gridContainer.innerHTML = '';
  
  // Create new grid
  for (let y = 0; y < this.currentSize; y++) {
    const row = [];
    const rowElement = document.createElement('div');
    rowElement.className = 'editor-grid-row';
    
    for (let x = 0; x < this.currentSize; x++) {
      const cell = { x, y, enabled: true };
      row.push(cell);
      
      const cellElement = document.createElement('div');
      cellElement.className = 'editor-grid-cell';
      cellElement.dataset.x = x;
      cellElement.dataset.y = y;
      
      cellElement.addEventListener('click', this.handleCellClick.bind(this));
      cellElement.addEventListener('mousedown', () => { this.isMouseDown = true; });
      cellElement.addEventListener('mouseup', () => { this.isMouseDown = false; });
      cellElement.addEventListener('mouseenter', this.handleCellMouseEnter.bind(this));
      cellElement.addEventListener('mouseleave', this.handleCellMouseLeave.bind(this));
      
      rowElement.appendChild(cellElement);
    }
    
    this.grid.push(row);
    this.gridContainer.appendChild(rowElement);
  }
};

MapEditor.prototype.handleSizeChange = function() {
  this.createGrid();
};

MapEditor.prototype.handleCellClick = function(event) {
  const x = parseInt(event.target.dataset.x);
  const y = parseInt(event.target.dataset.y);
  this.toggleCell(x, y);
};

MapEditor.prototype.handleCellMouseEnter = function(event) {
  if (this.isMouseDown && this.brushMode.checked) {
    const x = parseInt(event.target.dataset.x);
    const y = parseInt(event.target.dataset.y);
    this.toggleCell(x, y);
  }
};

MapEditor.prototype.handleCellMouseLeave = function(event) {
  // Nothing to do here for now
};

MapEditor.prototype.toggleCell = function(x, y) {
  const cell = this.grid[y][x];
  cell.enabled = !cell.enabled;
  
  const cellElement = document.querySelector(`.editor-grid-cell[data-x="${x}"][data-y="${y}"]`);
  if (cell.enabled) {
    cellElement.classList.remove('disabled');
  } else {
    cellElement.classList.add('disabled');
  }
};

MapEditor.prototype.validateMap = function() {
  // Count enabled cells
  let enabledCount = 0;
  for (let y = 0; y < this.currentSize; y++) {
    for (let x = 0; x < this.currentSize; x++) {
      if (this.grid[y][x].enabled) enabledCount++;
    }
  }
  
  if (enabledCount < 9) {
    this.validationMessage.textContent = 'Error: At least 9 enabled cells required!';
    return false;
  }
  
  // Check connectivity
  if (!this.isGridConnected()) {
    this.validationMessage.textContent = 'Error: All enabled cells must be connected!';
    return false;
  }
  
  this.validationMessage.textContent = 'Map is valid!';
  return true;
};

MapEditor.prototype.isGridConnected = function() {
  // Find first enabled cell
  let startX = -1, startY = -1;
  outerLoop:
  for (let y = 0; y < this.currentSize; y++) {
    for (let x = 0; x < this.currentSize; x++) {
      if (this.grid[y][x].enabled) {
        startX = x;
        startY = y;
        break outerLoop;
      }
    }
  }
  
  if (startX === -1) return true; // No enabled cells
  
  // BFS to find all connected enabled cells
  const visited = Array.from({ length: this.currentSize }, () => Array(this.currentSize).fill(false));
  const queue = [{ x: startX, y: startY }];
  visited[startY][startX] = true;
  
  const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  
  let connectedCount = 1;
  
  while (queue.length > 0) {
    const cell = queue.shift();
    
    for (const dir of directions) {
      const nx = cell.x + dir.x;
      const ny = cell.y + dir.y;
      
      if (nx >= 0 && nx < this.currentSize && ny >= 0 && ny < this.currentSize) {
        if (!visited[ny][nx] && this.grid[ny][nx].enabled) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
          connectedCount++;
        }
      }
    }
  }
  
  // Count total enabled cells
  let totalEnabled = 0;
  for (let y = 0; y < this.currentSize; y++) {
    for (let x = 0; x < this.currentSize; x++) {
      if (this.grid[y][x].enabled) totalEnabled++;
    }
  }
  
  return connectedCount === totalEnabled;
};

MapEditor.prototype.saveMap = function() {
  if (!this.validateMap()) return;
  
  // Create map data structure
  const mapData = {
    size: this.currentSize,
    grid: this.grid
  };
  
  // Save to localStorage
  localStorage.setItem('2048-custom-map', JSON.stringify(mapData));
  
  this.validationMessage.textContent = 'Map saved successfully!';
  this.close();
};

MapEditor.prototype.loadMap = function() {
  const mapData = JSON.parse(localStorage.getItem('2048-custom-map'));
  if (!mapData) return null;
  
  return mapData;
};

MapEditor.prototype.applyMapToGame = function(mapData) {
  if (!mapData) return false;
  
  // Update game manager with custom map
  this.gameManager.customMap = mapData;
  this.gameManager.setup();
  
  return true;
};