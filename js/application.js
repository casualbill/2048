// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  var mapEditor = new MapEditor(KeyboardInputManager, LocalStorageManager);
  
  // 让编辑器可以访问游戏管理器
  mapEditor.gameManager = gameManager;
  
  // 保存到全局对象，以便在调试和其他地方使用
  window.gameManager = gameManager;
  window.mapEditor = mapEditor;
});
