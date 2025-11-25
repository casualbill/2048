// Shape selection functionality
const shapeOptions = document.querySelectorAll('.shape-option');
const shapePreview = document.getElementById('shape-preview');
const startGameBtn = document.querySelector('.start-game');
let selectedShape = 'square';
let shapeConfig = {};

// Initialize shape selection
function initShapeSelection() {
  // Set square as default
  document.querySelector('.shape-option[data-shape="square"]').classList.add('active');
  updateShapePreview('square');

  // Add event listeners to shape options
  shapeOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove active class from all options
      shapeOptions.forEach(opt => opt.classList.remove('active'));
      // Add active class to selected option
      option.classList.add('active');
      // Get selected shape
      selectedShape = option.dataset.shape;
      // Update preview
      updateShapePreview(selectedShape);
    });
  });

  // Add event listener to start game button
  startGameBtn.addEventListener('click', () => {
    startGame(selectedShape, shapeConfig);
  });
}

// Update shape preview
function updateShapePreview(shapeName) {
  shapePreview.innerHTML = '';
  const shapeManager = new BoardShapeManager();
  let size;
  let availableCells;

  // Determine size based on shape
  switch (shapeName) {
    case 'square':
      size = 4;
      availableCells = shapeManager.getAvailableCells(shapeName, size);
      break;
    case 'diamond':
      size = 7;
      availableCells = shapeManager.getAvailableCells(shapeName, size);
      break;
    case 'circle':
      size = 5;
      availableCells = shapeManager.getAvailableCells(shapeName, size);
      break;
    case 'trapezoid':
      size = 6;
      availableCells = shapeManager.getAvailableCells(shapeName, size, shapeConfig.inverted);
      // Add toggle for trapezoid
      addTrapezoidToggle();
      break;
    case 'donut':
      size = 5;
      availableCells = shapeManager.getAvailableCells(shapeName, size);
      // Add toggle for donut wrap around
      addDonutToggle();
      break;
    default:
      size = 4;
      availableCells = shapeManager.getAvailableCells('square', size);
  }

  // Create grid container
  const gridContainer = document.createElement('div');
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = `repeat(${size}, 20px)`;
  gridContainer.style.gridGap = '1px';

  // Add preview tiles
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = document.createElement('div');
      tile.classList.add('preview-tile');
      tile.style.opacity = 0.3;
      // Check if cell is available
      const isAvailable = availableCells.some(cell => cell.x === x && cell.y === y);
      if (isAvailable) {
        tile.style.opacity = 1;
      }
      gridContainer.appendChild(tile);
    }
  }

  shapePreview.appendChild(gridContainer);
}

// Add trapezoid toggle
function addTrapezoidToggle() {
  // Remove existing toggle if any
  const existingToggle = document.querySelector('.shape-toggle');
  if (existingToggle) existingToggle.remove();

  const toggle = document.createElement('button');
  toggle.classList.add('shape-toggle');
  toggle.textContent = shapeConfig.inverted ? '切换为正梯形' : '切换为倒梯形';
  toggle.style.marginTop = '10px';
  toggle.style.padding = '5px 10px';
  toggle.style.cursor = 'pointer';
  
  toggle.addEventListener('click', () => {
    shapeConfig.inverted = !shapeConfig.inverted;
    toggle.textContent = shapeConfig.inverted ? '切换为正梯形' : '切换为倒梯形';
    updateShapePreview('trapezoid');
  });

  shapePreview.appendChild(toggle);
}

// Add donut toggle
function addDonutToggle() {
  // Remove existing toggle if any
  const existingToggle = document.querySelector('.shape-toggle');
  if (existingToggle) existingToggle.remove();

  const toggle = document.createElement('button');
  toggle.classList.add('shape-toggle');
  toggle.textContent = shapeConfig.wrapAround ? '关闭穿墙模式' : '开启穿墙模式';
  toggle.style.marginTop = '10px';
  toggle.style.padding = '5px 10px';
  toggle.style.cursor = 'pointer';
  
  toggle.addEventListener('click', () => {
    shapeConfig.wrapAround = !shapeConfig.wrapAround;
    toggle.textContent = shapeConfig.wrapAround ? '关闭穿墙模式' : '开启穿墙模式';
    // No need to update preview for this toggle
  });

  shapePreview.appendChild(toggle);
}

// Start the game
function startGame(shapeName, config) {
  // Hide shape selection
  document.querySelector('.shape-selection').style.display = 'none';
  // Show game container
  document.querySelector('.game-container').style.display = 'block';

  // Initialize game with selected shape
  let size;
  switch (shapeName) {
    case 'square':
      size = 4;
      break;
    case 'diamond':
      size = 7;
      break;
    case 'circle':
      size = 5;
      break;
    case 'trapezoid':
      size = 6;
      break;
    case 'donut':
      size = 5;
      break;
    default:
      size = 4;
  }

  // Create game manager
  const gameManager = new GameManager(size, KeyboardInputManager, HTMLActuator, LocalStorageManager, shapeName, config);
}

// Initialize shape selection when DOM is loaded
document.addEventListener('DOMContentLoaded', initShapeSelection);