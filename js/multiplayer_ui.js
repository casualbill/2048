// Multiplayer UI manager
function MultiplayerUI() {
  this.gameManager = null;
  this.multiplayerMode = false;
  this.selectedMode = "infinite";
  this.selectedTime = 60;
  
  this.init();
}

MultiplayerUI.prototype.init = function() {
  var self = this;
  
  // Multiplayer button click
  var multiplayerButton = document.querySelector(".multiplayer-button");
  if (multiplayerButton) {
    multiplayerButton.addEventListener("click", function() {
      self.showMultiplayerMenu();
    });
  }
  
  // Mode selection
  var modeButtons = document.querySelectorAll(".mode-button");
  modeButtons.forEach(function(button) {
    button.addEventListener("click", function() {
      self.selectedMode = this.getAttribute("data-mode");
      self.updateModeSelection();
    });
  });
  
  // Time selection
  var timeButtons = document.querySelectorAll(".time-button");
  timeButtons.forEach(function(button) {
    button.addEventListener("click", function() {
      self.selectedTime = parseInt(this.getAttribute("data-time"));
      self.updateTimeSelection();
    });
  });
  
  // Start multiplayer game
  var startButton = document.querySelector(".start-multiplayer-button");
  if (startButton) {
    startButton.addEventListener("click", function() {
      self.startMultiplayerGame();
    });
  }
  
  // Cancel multiplayer
  var cancelButton = document.querySelector(".cancel-multiplayer-button");
  if (cancelButton) {
    cancelButton.addEventListener("click", function() {
      self.hideMultiplayerMenu();
    });
  }
};

MultiplayerUI.prototype.showMultiplayerMenu = function() {
  var menu = document.querySelector(".multiplayer-menu");
  if (menu) {
    menu.style.display = "block";
  }
};

MultiplayerUI.prototype.hideMultiplayerMenu = function() {
  var menu = document.querySelector(".multiplayer-menu");
  if (menu) {
    menu.style.display = "none";
  }
};

MultiplayerUI.prototype.updateModeSelection = function() {
  // Update button styles
  var modeButtons = document.querySelectorAll(".mode-button");
  modeButtons.forEach(function(button) {
    var mode = button.getAttribute("data-mode");
    if (mode === this.selectedMode) {
      button.style.background = "#edc22e";
    } else {
      button.style.background = "#8f7a66";
    }
  }.bind(this));
  
  // Show/hide time selector
  var timeSelector = document.querySelector(".time-selector");
  if (timeSelector) {
    timeSelector.style.display = this.selectedMode === "timed" ? "block" : "none";
  }
};

MultiplayerUI.prototype.updateTimeSelection = function() {
  // Update button styles
  var timeButtons = document.querySelectorAll(".time-button");
  timeButtons.forEach(function(button) {
    var time = parseInt(button.getAttribute("data-time"));
    if (time === this.selectedTime) {
      button.style.background = "#edc22e";
    } else {
      button.style.background = "#8f7a66";
    }
  }.bind(this));
};

MultiplayerUI.prototype.startMultiplayerGame = function() {
  // Hide menu
  this.hideMultiplayerMenu();
  
  // Show both game boards
  var player2Board = document.querySelector(".player2");
  if (player2Board) {
    player2Board.style.display = "block";
  }
  
  // Initialize multiplayer game manager
  if (!this.gameManager || !(this.gameManager instanceof MultiplayerGameManager)) {
    this.gameManager = new MultiplayerGameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  }
  
  // Start timed game if selected
  if (this.selectedMode === "timed") {
    this.gameManager.startTimedGame(this.selectedTime);
  }
  
  this.multiplayerMode = true;
};

MultiplayerUI.prototype.isMultiplayerMode = function() {
  return this.multiplayerMode;
};

// Initialize multiplayer UI when page loads
window.addEventListener("load", function() {
  new MultiplayerUI();
});