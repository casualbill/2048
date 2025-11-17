function AchievementsManager(StorageManager) {
  this.storageManager = StorageManager;
  this.achievements = this.loadAchievements();
  this.currentGameData = this.initializeCurrentGameData();
  this.timer = null;
}

// 初始化当前游戏数据
AchievementsManager.prototype.initializeCurrentGameData = function() {
  return {
    highestTile: 2,
    consecutiveMerges: 0,
    consecutiveMergeStartTime: null,
    moves: 0,
    startTime: Date.now(),
    usedDirections: new Set(),
    merges512: 0,
    initial4Count: 0,
    lastMergeTime: null
  };
};

// 加载成就数据
AchievementsManager.prototype.loadAchievements = function() {
  var achievementsJSON = this.storageManager.storage.getItem('achievements');
  if (achievementsJSON) {
    return JSON.parse(achievementsJSON);
  }
  return {
    // 数字里程碑
    "初窥门径": { description: "在单局游戏中合成 512 方块", achieved: false, progress: 0 },
    "融会贯通": { description: "在单局游戏中合成 1024 方块", achieved: false, progress: 0 },
    "登峰造极": { description: "在单局游戏中合成 2048 方块", achieved: false, progress: 0 },
    "超越极限": { description: "在单局游戏中合成 4096 方块", achieved: false, progress: 0 },
    "神乎其技": { description: "在单局游戏中合成 8192 方块", achieved: false, progress: 0 },
    
    // 技巧与行为
    "连击高手": { description: "在10秒内连续进行5次有效的方块合并", achieved: false, progress: 0 },
    "完美开局": { description: "在游戏开局的10次滑动内，保持棋盘上没有出现16或更高的方块", achieved: false, progress: 0 },
    "四面楚歌": { description: "在单局游戏中，合成一个方块后，该方块的四个相邻格子上的方块数字都大于8", achieved: false, progress: 0 },
    "清道夫": { description: "完成一个滑动操作，该操作清空了棋盘上一整行或一整列的方块", achieved: false, progress: 0 },
    "单极制霸": { description: "仅使用两个方向的滑动操作成功合成1024方块", achieved: false, progress: 0 },
    "布局之美": { description: "棋盘上至少80%的格子被方块占据时，最高数字方块位于角落", achieved: false, progress: 0 },
    "滴水不漏": { description: "棋盘上所有16个格子都被方块占据，且最大数字方块小于1024", achieved: false, progress: 0 },
    
    // 累计与统计
    "勤奋耕耘": { description: "累计滑动操作次数达到5000次", achieved: false, progress: 0 },
    "巨额财富": { description: "累计游戏总得分达到1000000分", achieved: false, progress: 0 },
    "合并狂人": { description: "累计合成512方块50次", achieved: false, progress: 0 },
    "幸运眷顾": { description: "累计在初始位置获得4的方块100次", achieved: false, progress: 0 },
    "十战十胜": { description: "累计获得10次成功合成2048方块的胜利局", achieved: false, progress: 0 },
    
    // 挑战与结果
    "险中求胜": { description: "在当前得分低于500且棋盘上格子被方块占据数量大于等于14的绝境下，成功合成256方块", achieved: false, progress: 0 },
    "速战速决": { description: "在2分钟内成功合成1024方块", achieved: false, progress: 0 },
    "失败乃成功之母": { description: "游戏失败100次", achieved: false, progress: 0 }
  };
};

// 保存成就数据
AchievementsManager.prototype.saveAchievements = function() {
  this.storageManager.storage.setItem('achievements', JSON.stringify(this.achievements));
};

// 更新成就进度
AchievementsManager.prototype.updateAchievement = function(name, progress, achieved) {
  var achievement = this.achievements[name];
  if (achievement) {
    achievement.progress = progress;
    if (achieved && !achievement.achieved) {
      achievement.achieved = true;
      this.showAchievement(name, achievement.description);
    }
    this.saveAchievements();
  }
};

// 显示成就解锁消息
AchievementsManager.prototype.showAchievement = function(name, description) {
  // 调用HTMLActuator的显示成就通知方法
  if (window.gameManager && window.gameManager.actuator) {
    window.gameManager.actuator.showAchievementNotification(name, description);
  }
};

// 重置当前游戏数据
AchievementsManager.prototype.resetCurrentGameData = function() {
  this.currentGameData = this.initializeCurrentGameData();
};

// 检查数字里程碑成就
AchievementsManager.prototype.checkNumberMilestones = function(value) {
  if (value >= 512 && value < 1024) {
    this.updateAchievement('初窥门径', value, true);
  } else if (value >= 1024 && value < 2048) {
    this.updateAchievement('初窥门径', value, true);
    this.updateAchievement('融会贯通', value, true);
  } else if (value >= 2048 && value < 4096) {
    this.updateAchievement('初窥门径', value, true);
    this.updateAchievement('融会贯通', value, true);
    this.updateAchievement('登峰造极', value, true);
  } else if (value >= 4096 && value < 8192) {
    this.updateAchievement('初窥门径', value, true);
    this.updateAchievement('融会贯通', value, true);
    this.updateAchievement('登峰造极', value, true);
    this.updateAchievement('超越极限', value, true);
  } else if (value >= 8192) {
    this.updateAchievement('初窥门径', value, true);
    this.updateAchievement('融会贯通', value, true);
    this.updateAchievement('登峰造极', value, true);
    this.updateAchievement('超越极限', value, true);
    this.updateAchievement('神乎其技', value, true);
  }
};

// 检查连击高手成就
AchievementsManager.prototype.checkConsecutiveMerges = function(hasMerged) {
  if (hasMerged) {
    if (this.currentGameData.consecutiveMergeStartTime === null) {
      this.currentGameData.consecutiveMergeStartTime = Date.now();
      this.currentGameData.consecutiveMerges = 1;
    } else {
      var elapsedTime = Date.now() - this.currentGameData.consecutiveMergeStartTime;
      if (elapsedTime <= 10000) {
        this.currentGameData.consecutiveMerges++;
        if (this.currentGameData.consecutiveMerges >= 5) {
          this.updateAchievement('连击高手', 5, true);
        } else {
          this.updateAchievement('连击高手', this.currentGameData.consecutiveMerges, false);
        }
      } else {
        // 重置连击计数
        this.currentGameData.consecutiveMergeStartTime = Date.now();
        this.currentGameData.consecutiveMerges = 1;
        this.updateAchievement('连击高手', 1, false);
      }
    }
  } else {
    // 如果没有合并，重置连击计数
    this.currentGameData.consecutiveMergeStartTime = null;
    this.currentGameData.consecutiveMerges = 0;
    this.updateAchievement('连击高手', 0, false);
  }
};

// 检查完美开局成就
AchievementsManager.prototype.checkPerfectStart = function(grid) {
  if (this.currentGameData.moves <= 10) {
    var hasHighTile = false;
    grid.eachCell(function(x, y, tile) {
      if (tile && tile.value >= 16) {
        hasHighTile = true;
      }
    });
    if (!hasHighTile) {
      this.updateAchievement('完美开局', this.currentGameData.moves, true);
    }
  }
};

// 检查四面楚歌成就
AchievementsManager.prototype.checkSurrounded = function(grid, x, y, value) {
  if (value < 4) return; // 只检查4及以上的合并
  
  var positions = [
    { x: x - 1, y: y },
    { x: x + 1, y: y },
    { x: x, y: y - 1 },
    { x: x, y: y + 1 }
  ];
  
  var surrounded = true;
  for (var i = 0; i < positions.length; i++) {
    var pos = positions[i];
    var tile = grid.cellContent(pos);
    if (!tile || tile.value <= 8) {
      surrounded = false;
      break;
    }
  }
  
  if (surrounded) {
    this.updateAchievement('四面楚歌', 1, true);
  }
};

// 检查清道夫成就
AchievementsManager.prototype.checkCleaner = function(grid) {
  var size = grid.size;
  
  // 检查行
  for (var x = 0; x < size; x++) {
    var emptyCount = 0;
    for (var y = 0; y < size; y++) {
      if (!grid.cellContent({ x: x, y: y })) {
        emptyCount++;
      }
    }
    if (emptyCount === size) {
      this.updateAchievement('清道夫', 1, true);
      return;
    }
  }
  
  // 检查列
  for (var y = 0; y < size; y++) {
    var emptyCount = 0;
    for (var x = 0; x < size; x++) {
      if (!grid.cellContent({ x: x, y: y })) {
        emptyCount++;
      }
    }
    if (emptyCount === size) {
      this.updateAchievement('清道夫', 1, true);
      return;
    }
  }
};

// 检查单极制霸成就
AchievementsManager.prototype.checkSingleDominance = function(value) {
  if (value >= 1024 && this.currentGameData.usedDirections.size <= 2) {
    this.updateAchievement('单极制霸', 1, true);
  }
};

// 检查布局之美成就
AchievementsManager.prototype.checkLayoutBeauty = function(grid, highestTile) {
  var size = grid.size;
  var totalCells = size * size;
  var occupiedCells = 0;
  
  grid.eachCell(function(x, y, tile) {
    if (tile) {
      occupiedCells++;
    }
  });
  
  var occupancyRate = occupiedCells / totalCells;
  if (occupancyRate >= 0.8) {
    // 检查最高数字方块是否位于角落
    var corners = [
      { x: 0, y: 0 },
      { x: 0, y: size - 1 },
      { x: size - 1, y: 0 },
      { x: size - 1, y: size - 1 }
    ];
    
    for (var i = 0; i < corners.length; i++) {
      var corner = corners[i];
      var tile = grid.cellContent(corner);
      if (tile && tile.value === highestTile) {
        this.updateAchievement('布局之美', 1, true);
        return;
      }
    }
  }
};

// 检查滴水不漏成就
AchievementsManager.prototype.checkImpenetrable = function(grid, highestTile) {
  var size = grid.size;
  var totalCells = size * size;
  var occupiedCells = 0;
  
  grid.eachCell(function(x, y, tile) {
    if (tile) {
      occupiedCells++;
    }
  });
  
  if (occupiedCells === totalCells && highestTile < 1024) {
    this.updateAchievement('滴水不漏', 1, true);
  }
};

// 检查险中求胜成就
AchievementsManager.prototype.checkNarrowVictory = function(score, grid, value) {
  var size = grid.size;
  var totalCells = size * size;
  var occupiedCells = 0;
  
  grid.eachCell(function(x, y, tile) {
    if (tile) {
      occupiedCells++;
    }
  });
  
  if (score < 500 && occupiedCells >= 14 && value >= 256) {
    this.updateAchievement('险中求胜', 1, true);
  }
};

// 检查速战速决成就
AchievementsManager.prototype.checkQuickWin = function(value) {
  if (value >= 1024) {
    var elapsedTime = Date.now() - this.currentGameData.startTime;
    if (elapsedTime <= 120000) { // 2分钟
      this.updateAchievement('速战速决', 1, true);
    }
  }
};

// 更新累计滑动次数
AchievementsManager.prototype.updateTotalMoves = function() {
  var statsJSON = this.storageManager.storage.getItem('stats');
  var stats = statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
  stats.totalMoves++;
  this.storageManager.storage.setItem('stats', JSON.stringify(stats));
  
  if (stats.totalMoves >= 5000) {
    this.updateAchievement('勤奋耕耘', stats.totalMoves, true);
  } else {
    this.updateAchievement('勤奋耕耘', stats.totalMoves, false);
  }
};

// 更新累计得分
AchievementsManager.prototype.updateTotalScore = function(score) {
  var statsJSON = this.storageManager.storage.getItem('stats');
  var stats = statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
  stats.totalScore += score;
  this.storageManager.storage.setItem('stats', JSON.stringify(stats));
  
  if (stats.totalScore >= 1000000) {
    this.updateAchievement('巨额财富', stats.totalScore, true);
  } else {
    this.updateAchievement('巨额财富', stats.totalScore, false);
  }
};

// 更新累计合成512次数
AchievementsManager.prototype.updateTotal512Merges = function(value) {
  if (value === 512) {
    var statsJSON = this.storageManager.storage.getItem('stats');
    var stats = statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
    stats.total512Merges++;
    this.storageManager.storage.setItem('stats', JSON.stringify(stats));
    
    if (stats.total512Merges >= 50) {
      this.updateAchievement('合并狂人', stats.total512Merges, true);
    } else {
      this.updateAchievement('合并狂人', stats.total512Merges, false);
    }
  }
};

// 更新累计初始位置4的次数
AchievementsManager.prototype.updateTotalInitial4s = function(value) {
  if (value === 4) {
    var statsJSON = this.storageManager.storage.getItem('stats');
    var stats = statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
    stats.totalInitial4s++;
    this.storageManager.storage.setItem('stats', JSON.stringify(stats));
    
    if (stats.totalInitial4s >= 100) {
      this.updateAchievement('幸运眷顾', stats.totalInitial4s, true);
    } else {
      this.updateAchievement('幸运眷顾', stats.totalInitial4s, false);
    }
  }
};

// 更新累计胜利次数
AchievementsManager.prototype.updateTotalWins = function() {
  var statsJSON = this.storageManager.storage.getItem('stats');
  var stats = statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
  stats.totalWins++;
  this.storageManager.storage.setItem('stats', JSON.stringify(stats));
  
  if (stats.totalWins >= 10) {
    this.updateAchievement('十战十胜', stats.totalWins, true);
  } else {
    this.updateAchievement('十战十胜', stats.totalWins, false);
  }
};

// 更新累计失败次数
AchievementsManager.prototype.updateTotalLosses = function() {
  var statsJSON = this.storageManager.storage.getItem('stats');
  var stats = statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
  stats.totalLosses++;
  this.storageManager.storage.setItem('stats', JSON.stringify(stats));
  
  if (stats.totalLosses >= 100) {
    this.updateAchievement('失败乃成功之母', stats.totalLosses, true);
  } else {
    this.updateAchievement('失败乃成功之母', stats.totalLosses, false);
  }
};

// 获取当前游戏数据
AchievementsManager.prototype.getCurrentGameData = function() {
  return this.currentGameData;
};

// 获取所有成就
AchievementsManager.prototype.getAllAchievements = function() {
  return this.achievements;
};

// 获取统计数据
AchievementsManager.prototype.getStats = function() {
  var statsJSON = this.storageManager.storage.getItem('stats');
  return statsJSON ? JSON.parse(statsJSON) : { totalMoves: 0, totalScore: 0, total512Merges: 0, totalInitial4s: 0, totalWins: 0, totalLosses: 0 };
};