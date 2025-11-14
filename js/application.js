// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  const gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  // Initialize multiplayer manager
  gameManager.multiplayerManager = new MultiplayerManager(gameManager);
});
