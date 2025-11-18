// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // 初始化形状选择
  initShapeSelection();
});

function initShapeSelection() {
  // 显示形状选择界面
  const shapeSelection = document.getElementById('shape-selection');
  const gameContainer = document.getElementById('game-container');
  
  // 隐藏游戏界面，显示形状选择
  gameContainer.style.display = 'none';
  shapeSelection.style.display = 'block';
  
  // 绑定形状选择事件
  const shapeOptions = document.querySelectorAll('.shape-option');
  shapeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const shape = option.dataset.shape;
      startGame(shape);
    });
  });
}

function startGame(shape) {
  // 隐藏形状选择界面
  const shapeSelection = document.getElementById('shape-selection');
  const gameContainer = document.getElementById('game-container');
  
  shapeSelection.style.display = 'none';
  gameContainer.style.display = 'block';
  
  // 根据选择的形状创建游戏
  new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager, shape);
}
