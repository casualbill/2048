window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return this._data[id] = String(val);
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return this._data = {};
  }
};

function LocalStorageManager() {
  this.bestScoreKey     = "bestScore";
  this.gameStateKey     = "gameState";
  this.achievementsKey  = "achievements";

  var supported = this.localStorageSupported();
  this.storage = supported ? window.localStorage : window.fakeStorage;
}

LocalStorageManager.prototype.localStorageSupported = function () {
  var testKey = "test";

  try {
    var storage = window.localStorage;
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

// Best score getters/setters
LocalStorageManager.prototype.getBestScore = function () {
  return this.storage.getItem(this.bestScoreKey) || 0;
};

LocalStorageManager.prototype.setBestScore = function (score) {
  this.storage.setItem(this.bestScoreKey, score);
};

// Game state getters/setters and clearing
LocalStorageManager.prototype.getGameState = function () {
  var stateJSON = this.storage.getItem(this.gameStateKey);
  return stateJSON ? JSON.parse(stateJSON) : null;
};

LocalStorageManager.prototype.setGameState = function (gameState) {
  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
};

LocalStorageManager.prototype.clearGameState = function () {
  this.storage.removeItem(this.gameStateKey);
};

// Achievements getters/setters
LocalStorageManager.prototype.getAchievements = function () {
  var achievementsJSON = this.storage.getItem(this.achievementsKey);
  return achievementsJSON ? JSON.parse(achievementsJSON) : this.getDefaultAchievements();
};

LocalStorageManager.prototype.setAchievements = function (achievements) {
  this.storage.setItem(this.achievementsKey, JSON.stringify(achievements));
};

LocalStorageManager.prototype.getDefaultAchievements = function () {
  return {
    // 1. 数字里程碑
    "初窥门径": { unlocked: false, progress: 0, max: 1, criteria: "在单局游戏中合成 512 方块" },
    "融会贯通": { unlocked: false, progress: 0, max: 1, criteria: "在单局游戏中合成 1024 方块" },
    "登峰造极": { unlocked: false, progress: 0, max: 1, criteria: "在单局游戏中合成 2048 方块" },
    "超越极限": { unlocked: false, progress: 0, max: 1, criteria: "在单局游戏中合成 4096 方块" },
    "神乎其技": { unlocked: false, progress: 0, max: 1, criteria: "在单局游戏中合成 8192 方块" },

    // 2. 技巧与行为
    "连击高手": { unlocked: false, progress: 0, max: 5, criteria: "在10秒内连续进行5次有效的方块合并" },
    "完美开局": { unlocked: false, progress: 0, max: 10, criteria: "在游戏开局的10次滑动内，保持棋盘上没有出现16或更高的方块" },
    "四面楚歌": { unlocked: false, progress: 0, max: 1, criteria: "在单局游戏中，合成一个方块后，该方块的四个相邻格子上的方块数字都大于8" },
    "清道夫": { unlocked: false, progress: 0, max: 1, criteria: "完成一个滑动操作，该操作清空了棋盘上一整行或一整列的方块" },
    "单极制霸": { unlocked: false, progress: 0, max: 1, criteria: "仅使用两个方向的滑动操作成功合成1024方块" },
    "布局之美": { unlocked: false, progress: 0, max: 1, criteria: "棋盘上至少80%的格子被方块占据时，最高数字方块位于角落" },
    "滴水不漏": { unlocked: false, progress: 0, max: 1, criteria: "棋盘上所有16个格子都被方块占据，且最大数字方块小于 1024" },

    // 3. 累计与统计
    "勤奋耕耘": { unlocked: false, progress: 0, max: 5000, criteria: "累计滑动操作次数达到5000次" },
    "巨额财富": { unlocked: false, progress: 0, max: 1000000, criteria: "累计游戏总得分达到1000000分" },
    "合并狂人": { unlocked: false, progress: 0, max: 50, criteria: "累计合成512方块50次" },
    "幸运眷顾": { unlocked: false, progress: 0, max: 100, criteria: "累计在初始位置获得4的方块100次" },
    "十战十胜": { unlocked: false, progress: 0, max: 10, criteria: "累计获得10次成功合成2048方块的胜利局" },

    // 4. 挑战与结果
    "险中求胜": { unlocked: false, progress: 0, max: 1, criteria: "在当前得分低于500且棋盘上格子被方块占据数量大于等于14的绝境下，成功合成256方块" },
    "速战速决": { unlocked: false, progress: 0, max: 1, criteria: "在2分钟内成功合成1024方块" },
    "失败乃成功之母": { unlocked: false, progress: 0, max: 100, criteria: "游戏失败100次" }
  };
}
