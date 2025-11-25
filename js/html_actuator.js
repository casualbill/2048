function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false, metadata.events); // You lose
      } else if (metadata.won) {
        self.message(true, metadata.events); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won, events) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
  
  // Add buttons to show event history and leaderboard
  var lowerDiv = this.messageContainer.querySelector(".lower");
  if (lowerDiv) {
    // Clear existing buttons
    while (lowerDiv.firstChild) {
      lowerDiv.removeChild(lowerDiv.firstChild);
    }
    
    var eventBtn = document.createElement("a");
    eventBtn.textContent = "查看事件记录";
    eventBtn.classList.add("event-history-button");
    eventBtn.style.marginRight = "10px";
    eventBtn.addEventListener("click", function () {
      this.showEventHistory(events);
    }.bind(this));
    lowerDiv.appendChild(eventBtn);
    
    var leaderboardBtn = document.createElement("a");
    leaderboardBtn.textContent = "查看排行榜";
    leaderboardBtn.classList.add("leaderboard-button");
    leaderboardBtn.addEventListener("click", function () {
      this.showLeaderboard();
    }.bind(this));
    lowerDiv.appendChild(leaderboardBtn);
    
    if (won) {
      var keepBtn = document.createElement("a");
      keepBtn.textContent = "继续游戏";
      keepBtn.classList.add("keep-playing-button");
      keepBtn.style.marginRight = "10px";
      keepBtn.addEventListener("click", function () {
        this.continueGame();
      }.bind(this));
      lowerDiv.insertBefore(keepBtn, eventBtn);
    }
    
    var retryBtn = document.createElement("a");
    retryBtn.textContent = "重新开始";
    retryBtn.classList.add("retry-button");
    retryBtn.addEventListener("click", function () {
      window.location.reload();
    });
    lowerDiv.appendChild(retryBtn);
  }
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};

// Add visual effect to a tile
HTMLActuator.prototype.addEffect = function (tile, effect) {
  var tileElement = document.querySelector(".tile-position-" + (tile.x + 1) + "-" + (tile.y + 1));
  if (!tileElement) return;
  
  // Add appropriate CSS class for the effect
  var effectClass = "tile-" + effect;
  tileElement.classList.add(effectClass);
  
  // Remove effect after animation
  var self = this;
  setTimeout(function () {
    tileElement.classList.remove(effectClass);
  }, 1000);
};

// Show forbidden direction
HTMLActuator.prototype.showForbiddenDirection = function (direction) {
  var gameContainer = document.querySelector(".game-container");
  var forbiddenElement = document.createElement("div");
  forbiddenElement.classList.add("forbidden-direction");
  
  // Position based on direction (0: up, 1: right, 2: down, 3: left)
  var directions = [
    { top: "-20px", left: "50%", transform: "translateX(-50%)", content: "↑" },
    { top: "50%", right: "-20px", transform: "translateY(-50%)", content: "→" },
    { bottom: "-20px", left: "50%", transform: "translateX(-50%)", content: "↓" },
    { top: "50%", left: "-20px", transform: "translateY(-50%)", content: "←" }
  ];
  
  var style = directions[direction];
  forbiddenElement.style.position = "absolute";
  forbiddenElement.style.top = style.top || "auto";
  forbiddenElement.style.right = style.right || "auto";
  forbiddenElement.style.bottom = style.bottom || "auto";
  forbiddenElement.style.left = style.left || "auto";
  forbiddenElement.style.transform = style.transform;
  forbiddenElement.style.fontSize = "30px";
  forbiddenElement.style.color = "red";
  forbiddenElement.style.fontWeight = "bold";
  forbiddenElement.style.textShadow = "0 0 10px red";
  forbiddenElement.textContent = style.content;
  
  gameContainer.appendChild(forbiddenElement);
  
  // Remove after 10 seconds
  setTimeout(function () {
    forbiddenElement.remove();
  }, 10000);
};

// Show inverted direction indicator
HTMLActuator.prototype.showInvertedDirection = function () {
  var gameContainer = document.querySelector(".game-container");
  var invertElement = document.createElement("div");
  invertElement.classList.add("invert-direction");
  
  invertElement.style.position = "absolute";
  invertElement.style.top = "50%";
  invertElement.style.left = "50%";
  invertElement.style.transform = "translate(-50%, -50%)";
  invertElement.style.fontSize = "40px";
  invertElement.style.color = "red";
  invertElement.style.fontWeight = "bold";
  invertElement.style.textShadow = "0 0 10px red";
  invertElement.textContent = "⇅";
  invertElement.style.animation = "spin 1s linear infinite";
  
  gameContainer.appendChild(invertElement);
  
  // Remove after next move (5 seconds max)
  setTimeout(function () {
    invertElement.remove();
  }, 5000);
};

// Show event history at game end
HTMLActuator.prototype.showEventHistory = function (events) {
  var eventContainer = document.createElement("div");
  eventContainer.style.position = "fixed";
  eventContainer.style.top = "0";
  eventContainer.style.left = "0";
  eventContainer.style.width = "100%";
  eventContainer.style.height = "100%";
  eventContainer.style.background = "rgba(0, 0, 0, 0.8)";
  eventContainer.style.color = "white";
  eventContainer.style.padding = "20px";
  eventContainer.style.overflowY = "auto";
  
  var title = document.createElement("h2");
  title.textContent = "事件记录";
  eventContainer.appendChild(title);
  
  if (events.length === 0) {
    var p = document.createElement("p");
    p.textContent = "本局未触发任何事件";
    eventContainer.appendChild(p);
  } else {
    events.forEach(function (event, index) {
      var p = document.createElement("p");
      var type = event.type === "positive" ? "(正面)" : "(负面)";
      p.textContent = (index + 1) + ". " + event.name + " " + type;
      eventContainer.appendChild(p);
    });
  }
  
  var closeBtn = document.createElement("button");
  closeBtn.textContent = "关闭";
  closeBtn.style.padding = "10px 20px";
  closeBtn.style.marginTop = "20px";
  closeBtn.addEventListener("click", function () {
    eventContainer.remove();
  });
  eventContainer.appendChild(closeBtn);
  
  document.body.appendChild(eventContainer);
};

// Show leaderboard
HTMLActuator.prototype.showLeaderboard = function () {
  var leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  
  var leaderboardContainer = document.createElement("div");
  leaderboardContainer.style.position = "fixed";
  leaderboardContainer.style.top = "0";
  leaderboardContainer.style.left = "0";
  leaderboardContainer.style.width = "100%";
  leaderboardContainer.style.height = "100%";
  leaderboardContainer.style.background = "rgba(0, 0, 0, 0.8)";
  leaderboardContainer.style.color = "white";
  leaderboardContainer.style.padding = "20px";
  leaderboardContainer.style.overflowY = "auto";
  
  var title = document.createElement("h2");
  title.textContent = "排行榜";
  leaderboardContainer.appendChild(title);
  
  if (leaderboard.length === 0) {
    var p = document.createElement("p");
    p.textContent = "暂无记录";
    leaderboardContainer.appendChild(p);
  } else {
    var table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    
    var headerRow = document.createElement("tr");
    var headers = ["排名", "分数", "事件数", "时长", "模式", "日期"];
    headers.forEach(function (header) {
      var th = document.createElement("th");
      th.textContent = header;
      th.style.border = "1px solid white";
      th.style.padding = "8px";
      th.style.textAlign = "left";
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    leaderboard.forEach(function (entry, index) {
      var row = document.createElement("tr");
      var rank = document.createElement("td");
      rank.textContent = index + 1;
      rank.style.border = "1px solid white";
      rank.style.padding = "8px";
      row.appendChild(rank);
      
      var score = document.createElement("td");
      score.textContent = entry.score;
      score.style.border = "1px solid white";
      score.style.padding = "8px";
      row.appendChild(score);
      
      var eventCount = document.createElement("td");
      eventCount.textContent = entry.eventCount;
      eventCount.style.border = "1px solid white";
      eventCount.style.padding = "8px";
      row.appendChild(eventCount);
      
      var duration = document.createElement("td");
      duration.textContent = entry.duration + "s";
      duration.style.border = "1px solid white";
      duration.style.padding = "8px";
      row.appendChild(duration);
      
      var mode = document.createElement("td");
      mode.textContent = entry.mode;
      mode.style.border = "1px solid white";
      mode.style.padding = "8px";
      row.appendChild(mode);
      
      var date = document.createElement("td");
      date.textContent = new Date(entry.date).toLocaleString();
      date.style.border = "1px solid white";
      date.style.padding = "8px";
      row.appendChild(date);
      
      table.appendChild(row);
    });
    
    leaderboardContainer.appendChild(table);
  }
  
  var closeBtn = document.createElement("button");
  closeBtn.textContent = "关闭";
  closeBtn.style.padding = "10px 20px";
  closeBtn.style.marginTop = "20px";
  closeBtn.addEventListener("click", function () {
    leaderboardContainer.remove();
  });
  leaderboardContainer.appendChild(closeBtn);
  
  document.body.appendChild(leaderboardContainer);
};
