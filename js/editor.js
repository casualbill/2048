function MapEditor(InputManager, StorageManager) {
  this.inputManager = new InputManager();
  this.storageManager = StorageManager;
  this.size = 4;
  this.grid = null;
  this.enabledGrid = null;
  this.penMode = true; // true = enable, false = disable
  this.isDragging = false;
  this.isEditing = false;
  this.setup();
}

MapEditor.prototype.setup = function() {
  this.inputManager.on("editorToggle", this.toggleEditor.bind(this));
  this.inputManager.on("customMap", this.useCustomMap.bind(this));
  this.createEditorUI();
  this.hideEditor();
};

MapEditor.prototype.createEditorUI = function() {
  // 创建编辑器容器
  var editorContainer = document.createElement('div');
  editorContainer.className = 'editor-container';
  editorContainer.id = 'editor-container';
  
  // 创建编辑器标题
  var editorTitle = document.createElement('h2');
  editorTitle.className = 'editor-title';
  editorTitle.textContent = 'Map Editor';
  
  // 创建尺寸选择器
  var sizeSelector = document.createElement('div');
  sizeSelector.className = 'size-selector';
  sizeSelector.innerHTML = '<label>Size:</label>' +
    '<select id="map-size">' +
    '<option value="4">4x4</option>' +
    '<option value="5">5x5</option>' +
    '<option value="6">6x6</option>' +
    '<option value="7">7x7</option>' +
    '<option value="8">8x8</option>' +
    '</select>';
  
  // 创建画笔模式按钮
  var penModeBtn = document.createElement('button');
  penModeBtn.className = 'pen-mode-btn active';
  penModeBtn.id = 'pen-mode-enable';
  penModeBtn.textContent = 'Enable Cells';
  
  var eraserModeBtn = document.createElement('button');
  eraserModeBtn.className = 'pen-mode-btn';
  eraserModeBtn.id = 'pen-mode-disable';
  eraserModeBtn.textContent = 'Disable Cells';
  
  var modeContainer = document.createElement('div');
  modeContainer.className = 'mode-container';
  modeContainer.appendChild(penModeBtn);
  modeContainer.appendChild(eraserModeBtn);
  
  // 创建操作按钮
  var saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.id = 'save-map';
  saveBtn.textContent = 'Save Map';
  
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.id = 'cancel-editor';
  cancelBtn.textContent = 'Cancel';
  
  var btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(saveBtn);
  btnContainer.appendChild(cancelBtn);
  
  // 创建验证信息
  var validationMsg = document.createElement('div');
  validationMsg.className = 'validation-msg';
  validationMsg.id = 'validation-msg';
  validationMsg.textContent = '';
  
  // 创建编辑器网格
  var editorGrid = document.createElement('div');
  editorGrid.className = 'editor-grid-container';
  editorGrid.id = 'editor-grid-container';
  
  // 组装编辑器UI
  editorContainer.appendChild(editorTitle);
  editorContainer.appendChild(sizeSelector);
  editorContainer.appendChild(modeContainer);
  editorContainer.appendChild(editorGrid);
  editorContainer.appendChild(validationMsg);
  editorContainer.appendChild(btnContainer);
  
  // 添加到页面
  var container = document.querySelector('.container');
  container.appendChild(editorContainer);
  
  // 添加事件监听器
  this.bindEvents();
};

MapEditor.prototype.bindEvents = function() {
  // 尺寸选择器事件
  var sizeSelect = document.getElementById('map-size');
  sizeSelect.addEventListener('change', this.changeSize.bind(this));
  
  // 画笔模式按钮事件
  var penBtn = document.getElementById('pen-mode-enable');
  var eraserBtn = document.getElementById('pen-mode-disable');
  penBtn.addEventListener('click', this.setPenMode.bind(this, true));
  eraserBtn.addEventListener('click', this.setPenMode.bind(this, false));
  
  // 保存和取消按钮事件
  var saveBtn = document.getElementById('save-map');
  saveBtn.addEventListener('click', this.saveMap.bind(this));
  
  var cancelBtn = document.getElementById('cancel-editor');
  cancelBtn.addEventListener('click', this.hideEditor.bind(this));
  
  // 编辑器网格点击事件
  var editorGrid = document.getElementById('editor-grid-container');
  editorGrid.addEventListener('click', this.toggleCell.bind(this));
  editorGrid.addEventListener('mousedown', this.startDrag.bind(this));
  editorGrid.addEventListener('mouseup', this.stopDrag.bind(this));
  editorGrid.addEventListener('mouseleave', this.stopDrag.bind(this));
  editorGrid.addEventListener('mousemove', this.dragCell.bind(this));
};

MapEditor.prototype.toggleEditor = function() {
  var editorContainer = document.getElementById('editor-container');
  var gameContainer = document.querySelector('.game-container');
  var aboveGame = document.querySelector('.above-game');
  
  if (this.isEditing) {
    // 隐藏编辑器
    editorContainer.style.display = 'none';
    gameContainer.style.display = 'block';
    aboveGame.style.display = 'block';
    this.isEditing = false;
  } else {
    // 显示编辑器
    editorContainer.style.display = 'block';
    gameContainer.style.display = 'none';
    aboveGame.style.display = 'none';
    this.isEditing = true;
    this.loadMap();
  }
};

MapEditor.prototype.changeSize = function(e) {
  this.size = parseInt(e.target.value);
  this.loadMap();
};

MapEditor.prototype.setPenMode = function(penMode) {
  this.penMode = penMode;
  
  var penBtn = document.getElementById('pen-mode-enable');
  var eraserBtn = document.getElementById('pen-mode-disable');
  
  if (penMode) {
    penBtn.classList.add('active');
    eraserBtn.classList.remove('active');
  } else {
    eraserBtn.classList.add('active');
    penBtn.classList.remove('active');
  }
};

MapEditor.prototype.loadMap = function() {
  var savedMap = this.storageManager.getCustomMap();
  var editorGrid = document.getElementById('editor-grid-container');
  
  // 清空网格
  editorGrid.innerHTML = '';
  
  // 创建新的启用网格
  this.enabledGrid = [];
  for (var x = 0; x < this.size; x++) {
    this.enabledGrid[x] = [];
    for (var y = 0; y < this.size; y++) {
      // 默认所有格子都启用
      this.enabledGrid[x][y] = true;
    }
  }
  
  // 如果有保存的地图且尺寸匹配，则加载
  if (savedMap && savedMap.size === this.size) {
    this.enabledGrid = savedMap.enabledGrid;
  }
  
  // 创建网格元素
  editorGrid.style.width = (this.size * 108) + 'px';
  editorGrid.style.height = (this.size * 108) + 'px';
  
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      var cell = document.createElement('div');
      cell.className = 'editor-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      
      if (!this.enabledGrid[x][y]) {
        cell.classList.add('disabled');
      }
      
      editorGrid.appendChild(cell);
    }
  }
};

MapEditor.prototype.toggleCell = function(e) {
  if (e.target.classList.contains('editor-cell')) {
    var x = parseInt(e.target.dataset.x);
    var y = parseInt(e.target.dataset.y);
    
    this.enabledGrid[x][y] = this.penMode;
    this.updateCellVisual(x, y);
  }
};

MapEditor.prototype.startDrag = function(e) {
  this.isDragging = true;
};

MapEditor.prototype.stopDrag = function(e) {
  this.isDragging = false;
};

MapEditor.prototype.dragCell = function(e) {
  if (this.isDragging && e.target.classList.contains('editor-cell')) {
    var x = parseInt(e.target.dataset.x);
    var y = parseInt(e.target.dataset.y);
    
    this.enabledGrid[x][y] = this.penMode;
    this.updateCellVisual(x, y);
  }
};

MapEditor.prototype.updateCellVisual = function(x, y) {
  var cells = document.querySelectorAll('.editor-cell');
  cells.forEach(function(cell) {
    if (parseInt(cell.dataset.x) === x && parseInt(cell.dataset.y) === y) {
      if (this.enabledGrid[x][y]) {
        cell.classList.remove('disabled');
      } else {
        cell.classList.add('disabled');
      }
    }
  }.bind(this));
};

MapEditor.prototype.saveMap = function() {
  // 验证地图
  var validation = this.validateMap();
  var validationMsg = document.getElementById('validation-msg');
  
  if (!validation.valid) {
    validationMsg.textContent = validation.message;
    validationMsg.style.color = 'red';
    return;
  }
  
  // 保存地图
  this.storageManager.setCustomMap({ size: this.size, enabledGrid: this.enabledGrid });
  
  validationMsg.textContent = 'Map saved successfully!';
  validationMsg.style.color = 'green';
  
  // 3秒后关闭编辑器
  setTimeout(this.hideEditor.bind(this), 1500);
};

MapEditor.prototype.validateMap = function() {
  // 检查可用格子数量
  var count = 0;
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      if (this.enabledGrid[x][y]) {
        count++;
      }
    }
  }
  
  if (count < 9) {
    return { valid: false, message: 'At least 9 enabled cells are required!' };
  }
  
  // 检查所有可用格子是否连通
  if (!this.isConnected()) {
    return { valid: false, message: 'All enabled cells must be connected!' };
  }
  
  return { valid: true, message: 'Map is valid!' };
};

MapEditor.prototype.isConnected = function() {
  var visited = [];
  for (var x = 0; x < this.size; x++) {
    visited[x] = [];
    for (var y = 0; y < this.size; y++) {
      visited[x][y] = false;
    }
  }
  
  // 找到第一个可用格子
  var startX, startY;
  var found = false;
  for (var x = 0; x < this.size && !found; x++) {
    for (var y = 0; y < this.size && !found; y++) {
      if (this.enabledGrid[x][y]) {
        startX = x;
        startY = y;
        found = true;
      }
    }
  }
  
  if (!found) return false;
  
  // BFS
  var queue = [{x: startX, y: startY}];
  visited[startX][startY] = true;
  
  var directions = [
    {x: -1, y: 0}, // left
    {x: 1, y: 0},  // right
    {x: 0, y: -1}, // up
    {x: 0, y: 1}   // down
  ];
  
  var connectedCount = 1;
  
  while (queue.length > 0) {
    var current = queue.shift();
    
    for (var i = 0; i < directions.length; i++) {
      var newX = current.x + directions[i].x;
      var newY = current.y + directions[i].y;
      
      if (this.withinBounds(newX, newY) && this.enabledGrid[newX][newY] && !visited[newX][newY]) {
        visited[newX][newY] = true;
        queue.push({x: newX, y: newY});
        connectedCount++;
      }
    }
  }
  
  // 检查连接的格子数量是否等于总可用格子数量
  var totalEnabled = 0;
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      if (this.enabledGrid[x][y]) {
        totalEnabled++;
      }
    }
  }
  
  return connectedCount === totalEnabled;
};

MapEditor.prototype.withinBounds = function(x, y) {
  return x >= 0 && x < this.size && y >= 0 && y < this.size;
};

MapEditor.prototype.hideEditor = function() {
  var editorContainer = document.getElementById('editor-container');
  var gameContainer = document.querySelector('.game-container');
  var aboveGame = document.querySelector('.above-game');
  
  editorContainer.style.display = 'none';
  gameContainer.style.display = 'block';
  aboveGame.style.display = 'block';
  this.isEditing = false;
};

MapEditor.prototype.useCustomMap = function() {
  var savedMap = this.storageManager.getCustomMap();
  if (savedMap) {
    // 通知游戏管理器使用自定义地图
    if (window.gameManager) {
      window.gameManager.useCustomMap(savedMap);
    }
  }
};

// 添加样式
var style = document.createElement('style');
style.innerHTML = `
.editor-container {
  display: none;
  margin: 0 auto;
  width: fit-content;
  text-align: center;
}

.size-selector {
  margin: 10px 0;
}

.mode-container {
  margin: 10px 0;
}

.pen-mode-btn {
  margin: 0 5px;
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid #8f7a66;
  background-color: #edc22e;
  color: #fff;
  border-radius: 3px;
}

.pen-mode-btn.active {
  background-color: #edc22e;
  box-shadow: 0 0 10px rgba(237, 194, 46, 0.5);
}

.editor-grid-container {
  margin: 20px auto;
  position: relative;
  background-color: #bbada0;
  border-radius: 6px;
  padding: 10px;
}

.editor-cell {
  width: 100px;
  height: 100px;
  float: left;
  margin: 4px;
  background-color: #cdc1b4;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.editor-cell:hover {
  background-color: #eee4da;
}

.editor-cell.disabled {
  background-color: #bbada0;
}

.editor-cell.disabled:hover {
  background-color: #bbada0;
}

.validation-msg {
  margin: 10px 0;
  font-weight: bold;
}

.btn-container {
  margin: 10px 0;
}

.save-btn, .cancel-btn {
  margin: 0 5px;
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid #8f7a66;
  border-radius: 3px;
}

.save-btn {
  background-color: #edc22e;
  color: #fff;
}

.cancel-btn {
  background-color: #f9f6f2;
  color: #776e65;
}

.controls {
  margin: 10px 0;
}

.controls a {
  margin: 0 5px;
}`;
document.head.appendChild(style);