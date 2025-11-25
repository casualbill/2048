// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // Create canvas element for Babylon.js
  var canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  document.body.appendChild(canvas);
  
  new GameManager(4, KeyboardInputManager, BabylonActuator, LocalStorageManager, canvas);
});
