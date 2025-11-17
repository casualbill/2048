function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.achievementsContainer = document.querySelector(".achievements-container");
  this.achievementsList = document.querySelector(".achievements-list");
  this.achievementsButton = document.querySelector(".achievements-button");
  this.closeAchievementsButton = document.querySelector(".close-achievements");

  this.score = 0;
  
  // 初始化成就面板事件
  this.initAchievementsUI();
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

// 初始化成就面板UI
HTMLActuator.prototype.initAchievementsUI = function() {
  var self = this;
  
  // 成就按钮点击事件
  if (this.achievementsButton) {
    this.achievementsButton.addEventListener("click", function() {
      self.showAchievements();
    });
  }
  
  // 关闭成就面板事件
  if (this.closeAchievementsButton) {
    this.closeAchievementsButton.addEventListener("click", function() {
      self.hideAchievements();
    });
  }
};

// 显示成就面板
HTMLActuator.prototype.showAchievements = function() {
  if (this.achievementsContainer) {
    this.achievementsContainer.classList.add("active");
    // 渲染成就列表
    this.renderAchievements();
  }
};

// 隐藏成就面板
HTMLActuator.prototype.hideAchievements = function() {
  if (this.achievementsContainer) {
    this.achievementsContainer.classList.remove("active");
  }
};

// 渲染成就列表
HTMLActuator.prototype.renderAchievements = function() {
  if (!this.achievementsList) return;
  
  // 清空成就列表
  this.achievementsList.innerHTML = "";
  
  // 获取成就数据
  var achievementsManager = window.gameManager.achievementsManager;
  if (!achievementsManager) return;
  
  var achievements = achievementsManager.getAllAchievements();
  
  // 按类型分组成就
  var achievementGroups = {
    "数字里程碑": [],
    "技巧与行为": [],
    "累计与统计": [],
    "挑战与结果": []
  };
  
  // 将成就分配到不同组别
  for (var name in achievements) {
    if (achievements.hasOwnProperty(name)) {
      var achievement = achievements[name];
      
      // 根据成就名称判断组别
      if (name.includes("初窥门径") || name.includes("融会贯通") || name.includes("登峰造极") || name.includes("超越极限") || name.includes("神乎其技")) {
        achievementGroups["数字里程碑"].push({ name: name, data: achievement });
      } else if (name.includes("连击高手") || name.includes("完美开局") || name.includes("四面楚歌") || name.includes("清道夫") || name.includes("单极制霸") || name.includes("布局之美") || name.includes("滴水不漏")) {
        achievementGroups["技巧与行为"].push({ name: name, data: achievement });
      } else if (name.includes("勤奋耕耘") || name.includes("巨额财富") || name.includes("合并狂人") || name.includes("幸运眷顾") || name.includes("十战十胜")) {
        achievementGroups["累计与统计"].push({ name: name, data: achievement });
      } else if (name.includes("险中求胜") || name.includes("速战速决") || name.includes("失败乃成功之母")) {
        achievementGroups["挑战与结果"].push({ name: name, data: achievement });
      }
    }
  }
  
  // 渲染每个组别的成就
  for (var groupName in achievementGroups) {
    if (achievementGroups.hasOwnProperty(groupName)) {
      var group = achievementGroups[groupName];
      if (group.length === 0) continue;
      
      // 创建组别标题
      var groupHeader = document.createElement("div");
      groupHeader.className = "achievement-group-header";
      groupHeader.textContent = groupName;
      this.achievementsList.appendChild(groupHeader);
      
      // 创建组别成就列表
      var groupList = document.createElement("div");
      groupList.className = "achievement-group-list";
      groupList.style.gridColumn = "1 / -1";
      
      // 渲染组内每个成就
      group.forEach(function(achievement) {
        var achievementItem = document.createElement("div");
        achievementItem.className = "achievement-item";
        if (achievement.data.achieved) {
          achievementItem.classList.add("achieved");
        }
        
        var achievementName = document.createElement("div");
        achievementName.className = "achievement-name";
        achievementName.textContent = achievement.name;
        
        var achievementDesc = document.createElement("div");
        achievementDesc.className = "achievement-description";
        achievementDesc.textContent = achievement.data.description;
        
        var achievementProgress = document.createElement("div");
        achievementProgress.className = "achievement-progress";
        
        if (achievement.data.achieved) {
          achievementProgress.textContent = "已解锁";
        } else if (achievement.data.progress > 0) {
          achievementProgress.textContent = "进度: " + achievement.data.progress;
        } else {
          achievementProgress.textContent = "未解锁";
        }
        
        achievementItem.appendChild(achievementName);
        achievementItem.appendChild(achievementDesc);
        achievementItem.appendChild(achievementProgress);
        
        groupList.appendChild(achievementItem);
      });
      
      this.achievementsList.appendChild(groupList);
    }
  }
};

// 显示成就解锁通知
HTMLActuator.prototype.showAchievementNotification = function(name, description) {
  // 创建成就通知元素
  var notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = '<h3>成就解锁</h3><p>' + name + '</p><small>' + description + '</small>';
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(function() {
    notification.remove();
  }, 3000);
};
