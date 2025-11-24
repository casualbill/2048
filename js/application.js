// Wait till the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait till the browser is ready to render the game (avoids glitches)
  window.requestAnimationFrame(function () {
    window.multiplayerManager = new MultiplayerManager();
  });
});
