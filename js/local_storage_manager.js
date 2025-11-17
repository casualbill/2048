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
  this.statsKey         = "stats";

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
  return achievementsJSON ? JSON.parse(achievementsJSON) : null;
};

LocalStorageManager.prototype.setAchievements = function (achievements) {
  this.storage.setItem(this.achievementsKey, JSON.stringify(achievements));
};

// Stats getters/setters
LocalStorageManager.prototype.getStats = function () {
  var statsJSON = this.storage.getItem(this.statsKey);
  return statsJSON ? JSON.parse(statsJSON) : null;
};

LocalStorageManager.prototype.setStats = function (stats) {
  this.storage.setItem(this.statsKey, JSON.stringify(stats));
};
