ThreeJSActuator.prototype.createGrid = function() {
  // Create grid base
  const gridGeometry = new THREE.BoxGeometry(4.2, 0.2, 4.2);
  const gridMaterial = new THREE.MeshLambertMaterial({ color: 0xbbada0 });
  this.grid = new THREE.Mesh(gridGeometry, gridMaterial);
  this.grid.position.y = -0.1;
  this.grid.receiveShadow = true;
  this.scene.add(this.grid);
  
  // Create grid lines
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcdc1b4 });
  const lineThickness = 0.02;
  
  // Vertical lines (x direction)
  for (let x = -1.5; x <= 1.5; x += 1) {
    const lineGeometry = new THREE.BoxGeometry(lineThickness, 0.2, 4.2);
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(x, -0.05, 0);
    this.scene.add(line);
  }
  
  // Horizontal lines (z direction)
  for (let z = -1.5; z <= 1.5; z += 1) {
    const lineGeometry = new THREE.BoxGeometry(4.2, 0.2, lineThickness);
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, -0.05, z);
    this.scene.add(line);
  }
};

ThreeJSActuator.prototype.addLighting = function() {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  this.scene.add(ambientLight);
  
  // Directional light with shadow
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -5;
  directionalLight.shadow.camera.right = 5;
  directionalLight.shadow.camera.top = 5;
  directionalLight.shadow.camera.bottom = -5;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 20;
  this.scene.add(directionalLight);
};

ThreeJSActuator.prototype.loadFont = function() {
  this.fontLoader.load(
    'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/fonts/droid/droid_sans_bold.typeface.json',
    (font) => {
      this.font = font;
    }
  );
};

ThreeJSActuator.prototype.animate = function() {
  requestAnimationFrame(this.animate.bind(this));
  this.controls.update();
  this.renderer.render(this.scene, this.camera);
};

ThreeJSActuator.prototype.onWindowResize = function() {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
};

function ThreeJSActuator() {
  this.tileContainer = document.querySelector(".tile-container");
  this.scoreContainer = document.querySelector(".score-container");
  this.bestContainer = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
  
  // Three.js scene setup
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(0xfaf8ef);
  
  // Camera setup
  this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  this.camera.position.set(0, 8, 8);
  this.camera.lookAt(0, 0, 0);
  
  // Renderer setup
  this.renderer = new THREE.WebGLRenderer({ antialias: true });
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  this.renderer.setPixelRatio(window.devicePixelRatio);
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Add renderer to game container
  const gameContainer = document.querySelector(".game-container");
  gameContainer.appendChild(this.renderer.domElement);
  
  // OrbitControls for camera movement
  this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  this.controls.target.set(0, 0, 0);
  this.controls.enableDamping = true;
  this.controls.dampingFactor = 0.05;
  this.controls.minDistance = 5;
  this.controls.maxDistance = 20;
  this.controls.minPolarAngle = Math.PI / 6;
  this.controls.maxPolarAngle = Math.PI / 2;
  
  // Create grid
  this.createGrid();
  
  // Add lighting
  this.addLighting();
  
  // Tiles map
  this.tiles = new Map();
  
  // Font loader for 3D text
  this.fontLoader = new THREE.FontLoader();
  this.font = null;
  this.loadFont();
  
  // Animation loop
  this.animate();
  
  // Handle window resize
  window.addEventListener('resize', this.onWindowResize.bind(this), false);
};


ThreeJSActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    // Update tiles
    self.updateTiles(grid);

    // Update score
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

ThreeJSActuator.prototype.updateTiles = function(grid) {
  // First, remove tiles that are no longer in the grid
  const existingTiles = new Set();
  grid.cells.forEach(function (column) {
    column.forEach(function (cell) {
      if (cell) {
        existingTiles.add(cell.id);
      }
    });
  });

  // Remove tiles that are not in existingTiles
  for (const [id, tileMesh] of this.tiles) {
    if (!existingTiles.has(id)) {
      this.scene.remove(tileMesh.mesh);
      if (tileMesh.textMesh) {
        this.scene.remove(tileMesh.textMesh);
      }
      this.tiles.delete(id);
    }
  }

  // Add or update tiles that are in the grid
  grid.cells.forEach(function (column) {
    column.forEach(function (cell) {
      if (cell) {
        this.updateTile(cell);
      }
    }.bind(this));
  }.bind(this));
};

ThreeJSActuator.prototype.updateTile = function(tile) {
  const position = this.get3DPosition(tile.x, tile.y);
  
  if (this.tiles.has(tile.id)) {
    // Tile exists, update its position
    const tileMesh = this.tiles.get(tile.id);
    this.animateTileMovement(tileMesh, position);
  } else {
    // New tile, create it
    this.createTile(tile, position);
    
    // Check if this tile is a merge
    if (tile.mergedFrom) {
      this.animateMergeEffect(position, tile.value);
    }
  }
};

ThreeJSActuator.prototype.createTile = function(tile, position) {
  // Get tile color based on value
  const color = this.getTileColor(tile.value);
  
  // Create tile mesh
  const tileGeometry = new THREE.BoxGeometry(0.9, 0.5, 0.9);
  const tileMaterial = new THREE.MeshLambertMaterial({ color: color });
  const tileMesh = new THREE.Mesh(tileGeometry, tileMaterial);
  tileMesh.position.copy(position);
  tileMesh.castShadow = true;
  tileMesh.receiveShadow = true;
  this.scene.add(tileMesh);
  
  // Create text mesh if font is loaded
  let textMesh = null;
  if (this.font) {
    const textGeometry = new THREE.TextGeometry(tile.value.toString(), {
      font: this.font,
      size: 0.2,
      height: 0.05,
      curveSegments: 12,
    });
    textGeometry.center();
    
    const textMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.copy(position);
    textMesh.position.y += 0.3;
    textMesh.castShadow = true;
    this.scene.add(textMesh);
  }
  
  // Store tile mesh and text mesh
  this.tiles.set(tile.id, { mesh: tileMesh, textMesh: textMesh });
  
  // Animation for new tile
  tileMesh.scale.set(0.1, 0.1, 0.1);
  this.animateTileScale(tileMesh, { x: 1, y: 1, z: 1 }, 200);
  if (textMesh) {
    textMesh.scale.set(0.1, 0.1, 0.1);
    this.animateTileScale(textMesh, { x: 1, y: 1, z: 1 }, 200);
  }
};

ThreeJSActuator.prototype.animateTileMovement = function(tileMesh, targetPosition) {
  // Simple linear animation for now, will improve with TWEEN.js if needed
  const duration = 200;
  const startTime = Date.now();
  const startPosition = tileMesh.mesh.position.clone();
  const startTextPosition = tileMesh.textMesh ? tileMesh.textMesh.position.clone() : null;
  
  const animate = () => {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // Interpolate position
    tileMesh.mesh.position.x = startPosition.x + (targetPosition.x - startPosition.x) * progress;
    tileMesh.mesh.position.z = startPosition.z + (targetPosition.z - startPosition.z) * progress;
    
    if (tileMesh.textMesh) {
      tileMesh.textMesh.position.x = startTextPosition.x + (targetPosition.x - startTextPosition.x) * progress;
      tileMesh.textMesh.position.z = startTextPosition.z + (targetPosition.z - startTextPosition.z) * progress;
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

ThreeJSActuator.prototype.animateTileScale = function(mesh, targetScale, duration) {
  const startTime = Date.now();
  const startScale = mesh.scale.clone();
  
  const animate = () => {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // Interpolate scale
    mesh.scale.x = startScale.x + (targetScale.x - startScale.x) * progress;
    mesh.scale.y = startScale.y + (targetScale.y - startScale.y) * progress;
    mesh.scale.z = startScale.z + (targetScale.z - startScale.z) * progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

ThreeJSActuator.prototype.get3DPosition = function(x, y) {
  // Convert 2D grid position to 3D world position
  // Grid is 4x4, so positions are from -1.5 to 1.5 with step 1
  return new THREE.Vector3(
    x - 1.5, // x from 0-3 to -1.5-1.5
    0.25,    // y position (half of tile height)
    y - 1.5  // y from 0-3 to -1.5-1.5
  );
};

ThreeJSActuator.prototype.getTileColor = function(value) {
  // Color mapping based on 2048 game
  switch (value) {
    case 2: return 0xeee4da;
    case 4: return 0xede0c8;
    case 8: return 0xf2b179;
    case 16: return 0xf59563;
    case 32: return 0xf67c5f;
    case 64: return 0xf65e3b;
    case 128: return 0xedcf72;
    case 256: return 0xedcc61;
    case 512: return 0xedc850;
    case 1024: return 0xedc53f;
    case 2048: return 0xedc22e;
    default: return 0x3c3a32;
  }
};

ThreeJSActuator.prototype.animateMergeEffect = function(position, value) {
  // Create a temporary mesh to show the merge effect
  const color = this.getTileColor(value);
  const geometry = new THREE.BoxGeometry(1, 0.6, 1);
  const material = new THREE.MeshLambertMaterial({ color: color, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.position.y += 0.05;
  this.scene.add(mesh);

  // Animate the mesh to scale up and fade out
  const duration = 300;
  const startTime = Date.now();
  
  const animate = () => {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // Scale up and fade out
    mesh.scale.x = 1 + progress;
    mesh.scale.y = 1 + progress;
    mesh.scale.z = 1 + progress;
    mesh.material.opacity = 1 - progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Remove the mesh after animation
      this.scene.remove(mesh);
    }
  };
  
  requestAnimationFrame(animate);
};

// Rest of the methods are same as HTMLActuator

// Continues the game (both restart and keep playing)
ThreeJSActuator.prototype.continueGame = function () {
  this.clearMessage();
};

ThreeJSActuator.prototype.updateScore = function (score) {
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

ThreeJSActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

ThreeJSActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

ThreeJSActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};

ThreeJSActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

