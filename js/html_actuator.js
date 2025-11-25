function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.leaderboardContainer = document.getElementById("leaderboard-container");

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
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
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

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};

HTMLActuator.prototype.fetchLeaderboard = function () {
  fetch('/api/leaderboard')
    .then(response => response.json())
    .then(data => this.displayLeaderboard(data))
    .catch(error => console.error('Error fetching leaderboard:', error));
};

HTMLActuator.prototype.displayLeaderboard = function (leaderboard) {
  if (!this.leaderboardContainer) return;

  this.clearContainer(this.leaderboardContainer);

  const title = document.createElement('h2');
  title.textContent = 'Leaderboard';
  title.style.marginBottom = '10px';
  this.leaderboardContainer.appendChild(title);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  // Header
  const headerRow = document.createElement('tr');
  const rankHeader = document.createElement('th');
  rankHeader.textContent = 'Rank';
  rankHeader.style.border = '1px solid #ccc';
  rankHeader.style.padding = '5px';
  rankHeader.style.textAlign = 'left';
  headerRow.appendChild(rankHeader);

  const scoreHeader = document.createElement('th');
  scoreHeader.textContent = 'Score';
  scoreHeader.style.border = '1px solid #ccc';
  scoreHeader.style.padding = '5px';
  scoreHeader.style.textAlign = 'left';
  headerRow.appendChild(scoreHeader);

  const timeHeader = document.createElement('th');
  timeHeader.textContent = 'Time (s)';
  timeHeader.style.border = '1px solid #ccc';
  timeHeader.style.padding = '5px';
  timeHeader.style.textAlign = 'left';
  headerRow.appendChild(timeHeader);

  table.appendChild(headerRow);

  // Rows
  leaderboard.forEach((entry, index) => {
    const row = document.createElement('tr');

    const rankCell = document.createElement('td');
    rankCell.textContent = index + 1;
    rankCell.style.border = '1px solid #ccc';
    rankCell.style.padding = '5px';
    row.appendChild(rankCell);

    const scoreCell = document.createElement('td');
    scoreCell.textContent = entry.score;
    scoreCell.style.border = '1px solid #ccc';
    scoreCell.style.padding = '5px';
    row.appendChild(scoreCell);

    const timeCell = document.createElement('td');
    timeCell.textContent = entry.timeTaken.toFixed(2);
    timeCell.style.border = '1px solid #ccc';
    timeCell.style.padding = '5px';
    row.appendChild(timeCell);

    table.appendChild(row);
  });

  this.leaderboardContainer.appendChild(table);
};
