function BabylonActuator(container) {
  this.container = container;
  this.engine = new BABYLON.Engine(container, true);
  this.scene = new BABYLON.Scene(this.engine);
  this.scene.clearColor = new BABYLON.Color3(0.9, 0.9, 0.9);
  
  this.tiles = {};
  this.gridSize = 4;
  this.cellSize = 1.2;
  
  this.createCamera();
  this.createLight();
  this.createGrid();
  
  var self = this;
  this.engine.runRenderLoop(function() {
    self.scene.render();
  });
  
  window.addEventListener('resize', function() {
    self.engine.resize();
  });
}

BabylonActuator.prototype.createCamera = function() {
  this.camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2.5, 12, new BABYLON.Vector3(2, 2, 2), this.scene);
  this.camera.attachControl(this.container, true);
  // Configure camera controls
  this.camera.lowerRadiusLimit = 8;
  this.camera.upperRadiusLimit = 20;
  this.camera.wheelPrecision = 100;
};

BabylonActuator.prototype.createLight = function() {
  var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
  light.intensity = 0.7;
};

BabylonActuator.prototype.createGrid = function() {
  this.grid = [];
  var gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene);
  gridMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  
  for (var x = 0; x < this.gridSize; x++) {
    this.grid[x] = [];
    for (var y = 0; y < this.gridSize; y++) {
      this.grid[x][y] = [];
      for (var z = 0; z < this.gridSize; z++) {
        var box = BABYLON.MeshBuilder.CreateBox("grid-cell-" + x + "-" + y + "-" + z, 
          {width: this.cellSize - 0.02, height: this.cellSize - 0.02, depth: this.cellSize - 0.02}, this.scene);
        box.position = new BABYLON.Vector3(
          x * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
          y * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
          z * this.cellSize - (this.gridSize - 1) * this.cellSize / 2
        );
        box.material = gridMaterial;
        this.grid[x][y][z] = box;
      }
    }
  }

  // Create particle system for merge effects
  this.mergeParticleSystem = new BABYLON.ParticleSystem("mergeParticles", 2000, this.scene);
  this.mergeParticleSystem.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
  this.mergeParticleSystem.emitter = this.grid;
  this.mergeParticleSystem.minEmitBox = new BABYLON.Vector3(-1, -1, -1);
  this.mergeParticleSystem.maxEmitBox = new BABYLON.Vector3(1, 1, 1);
  this.mergeParticleSystem.color1 = new BABYLON.Color4(1, 0.8, 0, 1);
  this.mergeParticleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
  this.mergeParticleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0);
  this.mergeParticleSystem.minSize = 0.1;
  this.mergeParticleSystem.maxSize = 0.3;
  this.mergeParticleSystem.minLifeTime = 0.3;
  this.mergeParticleSystem.maxLifeTime = 1;
  this.mergeParticleSystem.emitRate = 1000;
  this.mergeParticleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  this.mergeParticleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
  this.mergeParticleSystem.direction1 = new BABYLON.Vector3(-2, 8, -2);
  this.mergeParticleSystem.direction2 = new BABYLON.Vector3(2, 8, 2);
  this.mergeParticleSystem.minAngularSpeed = 0;
  this.mergeParticleSystem.maxAngularSpeed = Math.PI;
  this.mergeParticleSystem.minEmitPower = 1;
  this.mergeParticleSystem.maxEmitPower = 3;
  this.mergeParticleSystem.updateSpeed = 0.005;
  this.mergeParticleSystem.stop();
};

BabylonActuator.prototype.createTile = function(position, value) {
  var tileId = "tile-" + position.x + "-" + position.y + "-" + position.z;
  
  if (this.tiles[tileId]) {
    this.tiles[tileId].dispose();
  }
  
  var tileMaterial = new BABYLON.StandardMaterial("tileMaterial-" + value, this.scene);
  tileMaterial.diffuseColor = this.getTileColor(value);
  
  var tile = BABYLON.MeshBuilder.CreateBox("tile-" + position.x + "-" + position.y + "-" + position.z, 
    {width: this.cellSize - 0.1, height: this.cellSize - 0.1, depth: this.cellSize - 0.1}, this.scene);
  tile.position = new BABYLON.Vector3(
    position.x * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
    position.y * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
    position.z * this.cellSize - (this.gridSize - 1) * this.cellSize / 2
  );
  tile.material = tileMaterial;
  
  this.tiles[tileId] = tile;
  this.createText(tile, value);
};

BabylonActuator.prototype.createText = function(tile, value) {
  var fontData = {
    fontName: "Arial",
    fontSize: 48,
    fontStyle: "bold",
    fontColor: "white"
  };
  
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 512, this.scene, true);
  var context = dynamicTexture.getContext();
  
  context.clearRect(0, 0, 512, 512);
  context.font = fontData.fontStyle + " " + fontData.fontSize + "px " + fontData.fontName;
  context.fillStyle = fontData.fontColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(value.toString(), 256, 256);
  
  dynamicTexture.update();
  
  var textPlane = BABYLON.MeshBuilder.CreatePlane("textPlane", {width: 0.8, height: 0.8}, this.scene);
  textPlane.parent = tile;
  textPlane.position = new BABYLON.Vector3(0, 0, (this.cellSize - 0.1) / 2 + 0.01);
  textPlane.rotation.y = Math.PI / 4;
  
  var textMaterial = new BABYLON.StandardMaterial("textMaterial", this.scene);
  textMaterial.diffuseTexture = dynamicTexture;
  textMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  textPlane.material = textMaterial;
};

BabylonActuator.prototype.getTileColor = function(value) {
  var colors = {
    2: new BABYLON.Color3(0.9, 0.9, 0.9),
    4: new BABYLON.Color3(0.9, 0.87, 0.78),
    8: new BABYLON.Color3(1.0, 0.71, 0.53),
    16: new BABYLON.Color3(1.0, 0.53, 0.38),
    32: new BABYLON.Color3(1.0, 0.41, 0.24),
    64: new BABYLON.Color3(0.99, 0.23, 0.0),
    128: new BABYLON.Color3(0.97, 0.78, 0.37),
    256: new BABYLON.Color3(0.98, 0.74, 0.25),
    512: new BABYLON.Color3(0.98, 0.69, 0.13),
    1024: new BABYLON.Color3(0.98, 0.65, 0.0),
    2048: new BABYLON.Color3(0.98, 0.61, 0.0),
    4096: new BABYLON.Color3(0.8, 0.0, 0.8),
    8192: new BABYLON.Color3(0.6, 0.0, 0.6)
  };
  
  return colors[value] || new BABYLON.Color3(0.0, 0.0, 0.0);
};

BabylonActuator.prototype.actuate = function(grid, metadata) {
  var self = this;
  
  // Keep track of old tile positions
  var oldTiles = {};
  for (var id in this.tiles) {
    if (this.tiles.hasOwnProperty(id)) {
      oldTiles[id] = {
        mesh: this.tiles[id],
        position: this.tiles[id].position.clone()
      };
    }
  }
  
  // Create new tiles
  grid.eachCell(function(x, y, z, tile) {
    if (tile) {
      var tileId = "tile-" + x + "-" + y + "-" + z;
      if (oldTiles[tileId]) {
        // Animate tile from old position to new position
        var newPosition = new BABYLON.Vector3(
          x * self.cellSize - (self.gridSize - 1) * self.cellSize / 2,
          y * self.cellSize - (self.gridSize - 1) * self.cellSize / 2,
          z * self.cellSize - (self.gridSize - 1) * self.cellSize / 2
        );
        self.animateTile(oldTiles[tileId].mesh, oldTiles[tileId].position, newPosition);
        delete oldTiles[tileId];
      } else {
        // Create new tile with scale animation
        self.createTile({x: x, y: y, z: z}, tile.value);
        var tileMesh = self.tiles[tileId];
        tileMesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
        BABYLON.Animation.CreateAndStartAnimation("scaleAnimation", tileMesh, "scaling", 60, 10, tileMesh.scaling, new BABYLON.Vector3(1, 1, 1));
      }
    }
  });
  
  // Dispose remaining old tiles (merged or removed)
  for (var id in oldTiles) {
    if (oldTiles.hasOwnProperty(id)) {
      const mesh = oldTiles[id].mesh;
      // Emit particles at merge position
      this.mergeParticleSystem.emitter = mesh;
      this.mergeParticleSystem.start();
      setTimeout(() => this.mergeParticleSystem.stop(), 100);
      mesh.dispose();
    }
  }
  
  // Update score
  var scoreContainer = document.querySelector('.score-container');
  if (scoreContainer) {
    scoreContainer.textContent = metadata.score;
  }
  
  var bestContainer = document.querySelector('.best-container');
  if (bestContainer) {
    bestContainer.textContent = metadata.bestScore;
  }
};

BabylonActuator.prototype.animateTile = function(tileMesh, startPosition, endPosition) {
  BABYLON.Animation.CreateAndStartAnimation("moveAnimation", tileMesh, "position", 60, 10, startPosition, endPosition);
};

BabylonActuator.prototype.continueGame = function() {
  // Clear game message
  var gameMessage = document.querySelector('.game-message');
  if (gameMessage) {
    gameMessage.classList.remove('game-won', 'game-over');
  }
};