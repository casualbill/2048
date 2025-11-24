function MultiplayerKeyboardInputManager() {
  this.events = {};

  if (window.navigator.msPointerEnabled) {
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.listen();
}

MultiplayerKeyboardInputManager.prototype.on = function(event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

MultiplayerKeyboardInputManager.prototype.emit = function(event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function(callback) {
      callback(data);
    });
  }
};

MultiplayerKeyboardInputManager.prototype.listen = function() {
  var self = this;

  var player1Map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3  // Left
  };

  var player2Map = {
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3  // A
  };

  // Respond to direction keys
  document.addEventListener("keydown", function(event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var player1Mapped = player1Map[event.which];
    var player2Mapped = player2Map[event.which];

    if (!modifiers) {
      if (player1Mapped !== undefined) {
        event.preventDefault();
        self.emit("move", { player: 1, direction: player1Mapped });
      } else if (player2Mapped !== undefined) {
        event.preventDefault();
        self.emit("move", { player: 2, direction: player2Mapped });
      }
    }

    // R key restarts the game
    if (!modifiers && event.which === 82) {
      self.restart.call(self, event);
    }
  });

  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);

  // Respond to swipe events for both players
  var touchStartClientX, touchStartClientY, activePlayer;
  var player1GameContainer = document.querySelector(".player-1-game");
  var player2GameContainer = document.querySelector(".player-2-game");

  function handleTouchStart(event, player) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches.length > 1) {
      return;
    }

    activePlayer = player;

    if (window.navigator.msPointerEnabled) {
      touchStartClientX = event.pageX;
      touchStartClientY = event.pageY;
    } else {
      touchStartClientX = event.touches[0].clientX;
      touchStartClientY = event.touches[0].clientY;
    }

    event.preventDefault();
  }

  function handleTouchMove(event) {
    event.preventDefault();
  }

  function handleTouchEnd(event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
        event.targetTouches.length > 0) {
      return;
    }

    var touchEndClientX, touchEndClientY;

    if (window.navigator.msPointerEnabled) {
      touchEndClientX = event.pageX;
      touchEndClientY = event.pageY;
    } else {
      touchEndClientX = event.changedTouches[0].clientX;
      touchEndClientY = event.changedTouches[0].clientY;
    }

    var dx = touchEndClientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = touchEndClientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      var direction = absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      self.emit("move", { player: activePlayer, direction: direction });
    }
  }

  // Bind touch events for player 1
  player1GameContainer.addEventListener(this.eventTouchstart, function(event) {
    handleTouchStart(event, 1);
  });

  player1GameContainer.addEventListener(this.eventTouchmove, handleTouchMove);

  player1GameContainer.addEventListener(this.eventTouchend, handleTouchEnd);

  // Bind touch events for player 2
  player2GameContainer.addEventListener(this.eventTouchstart, function(event) {
    handleTouchStart(event, 2);
  });

  player2GameContainer.addEventListener(this.eventTouchmove, handleTouchMove);

  player2GameContainer.addEventListener(this.eventTouchend, handleTouchEnd);
};

MultiplayerKeyboardInputManager.prototype.restart = function(event) {
  event.preventDefault();
  this.emit("restart");
};

MultiplayerKeyboardInputManager.prototype.keepPlaying = function(event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

MultiplayerKeyboardInputManager.prototype.bindButtonPress = function(selector, fn) {
  var buttons = document.querySelectorAll(selector);
  buttons.forEach(function(button) {
    button.addEventListener("click", fn.bind(this));
    button.addEventListener(this.eventTouchend, fn.bind(this));
  }.bind(this));
};
