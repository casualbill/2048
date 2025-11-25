// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  const gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager, MapEditor);
  
  // Add event listeners for map editor buttons
  document.querySelector('.editor-button').addEventListener('click', () => {
    gameManager.mapEditor.open();
  });
  
  document.querySelector('.custom-map-button').addEventListener('click', () => {
    const customMap = gameManager.mapEditor.loadMap();
    if (customMap) {
      gameManager.mapEditor.applyMapToGame(customMap);
    } else {
      alert('No custom map saved!');
    }
  });
});
