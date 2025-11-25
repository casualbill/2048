class MultiplayerManager {
  constructor() {
    this.socket = new WebSocket('ws://localhost:8767');
    this.currentRoom = null;
    this.isHost = false;
    this.gameMode = 'timed';
    this.opponentGrid = null;
    this.opponentScore = 0;
    this.isSpectating = false;
    
    // Set up socket event listeners
    this.socket.addEventListener('open', () => {
      console.log('Connected to multiplayer server');
    });
    
    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleServerMessage(data);
    });
    
    this.socket.addEventListener('close', () => {
      console.log('Disconnected from multiplayer server');
    });
    
    // Initialize UI
    this.initUI();
  }
  
  initUI() {
    // Create multiplayer menu
    this.multiplayerMenu = document.createElement('div');
    this.multiplayerMenu.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #faf8ef;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 1000;
      display: none;
    `;
    
    // Create room section
    const roomSection = document.createElement('div');
    roomSection.innerHTML = `
      <h3>Multiplayer</h3>
      <div style="margin-bottom: 10px;">
        <button id="createRoomBtn">Create Room</button>
        <button id="joinRoomBtn">Join Room</button>
        <button id="spectateBtn">Spectate</button>
      </div>
      <div id="roomList" style="display: none; margin-top: 10px;">
        <h4>Available Rooms:</h4>
        <div id="roomsContainer"></div>
      </div>
      <div id="roomForm" style="display: none; margin-top: 10px;">
        <input type="text" id="roomNumber" placeholder="Room Number" style="margin-right: 5px;">
        <input type="password" id="roomPassword" placeholder="Password (optional)" style="margin-right: 5px;">
        <button id="joinBtn">Join</button>
      </div>
      <div id="createRoomForm" style="display: none; margin-top: 10px;">
        <label>Mode:
          <select id="gameModeSelect">
            <option value="timed">Timed (3 min)</option>
            <option value="race">Race to 2048</option>
            <option value="elimination">Elimination</option>
            <option value="team">Team</option>
          </select>
        </label>
        <input type="password" id="createPassword" placeholder="Password (optional)" style="margin-left: 5px;">
        <button id="createBtn">Create</button>
      </div>
    `;
    
    this.multiplayerMenu.appendChild(roomSection);
    document.body.appendChild(this.multiplayerMenu);
    
    // Add event listeners for menu buttons
    document.querySelector('.multiplayer-button').addEventListener('click', () => {
      this.multiplayerMenu.style.display = 'block';
      this.listRooms();
    });
    
    document.getElementById('createRoomBtn').addEventListener('click', () => {
      document.getElementById('roomList').style.display = 'none';
      document.getElementById('roomForm').style.display = 'none';
      document.getElementById('createRoomForm').style.display = 'block';
    });
    
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
      document.getElementById('roomList').style.display = 'none';
      document.getElementById('createRoomForm').style.display = 'none';
      document.getElementById('roomForm').style.display = 'block';
    });
    
    document.getElementById('spectateBtn').addEventListener('click', () => {
      this.isSpectating = true;
      document.getElementById('roomList').style.display = 'block';
      document.getElementById('roomForm').style.display = 'none';
      document.getElementById('createRoomForm').style.display = 'none';
    });
    
    document.getElementById('joinBtn').addEventListener('click', () => {
      const roomNumber = document.getElementById('roomNumber').value;
      const password = document.getElementById('roomPassword').value;
      this.joinRoom(roomNumber, password);
    });
    
    document.getElementById('createBtn').addEventListener('click', () => {
      const mode = document.getElementById('gameModeSelect').value;
      const password = document.getElementById('createPassword').value;
      this.createRoom(mode, password);
    });
    
    // Create opponent game container
    this.opponentGameContainer = document.createElement('div');
    this.opponentGameContainer.style.cssText = `
      width: 200px;
      margin: 0 auto;
      position: relative;
      top: -20px;
    `;
    document.querySelector('.container').insertBefore(this.opponentGameContainer, document.querySelector('.game-container'));
    
    // Create score display for opponent
    this.opponentScoreDisplay = document.createElement('div');
    this.opponentScoreDisplay.style.cssText = `
      background: #bbada0;
      padding: 10px;
      border-radius: 5px;
      color: white;
      text-align: center;
      margin-bottom: 10px;
    `;
    this.opponentGameContainer.appendChild(this.opponentScoreDisplay);
    
    // Create room number display
    this.roomNumberDisplay = document.createElement('div');
    this.roomNumberDisplay.style.cssText = `
      background: #bbada0;
      padding: 5px 10px;
      border-radius: 3px;
      color: white;
      text-align: center;
      font-size: 12px;
      margin-bottom: 5px;
    `;
    this.opponentGameContainer.insertBefore(this.roomNumberDisplay, this.opponentScoreDisplay);
    
    // Create opponent grid container
    this.opponentGridContainer = document.createElement('div');
    this.opponentGridContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 5px;
    `;
    this.opponentGameContainer.appendChild(this.opponentGridContainer);
    
    // Create opponent tiles container
    this.opponentTileContainer = document.createElement('div');
    this.opponentTileContainer.style.cssText = `
      position: absolute;
      top: 30px;
      left: 0;
      right: 0;
      margin: 0 auto;
      width: 200px;
      height: 200px;
    `;
    this.opponentGameContainer.appendChild(this.opponentTileContainer);
    
    // Create opponent grid cells
    for (let i = 0; i < 4; i++) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        gap: 5px;
      `;
      for (let j = 0; j < 4; j++) {
        const cell = document.createElement('div');
        cell.style.cssText = `
          width: 45px;
          height: 45px;
          background: #cdc1b4;
          border-radius: 5px;
        `;
        row.appendChild(cell);
      }
      this.opponentGridContainer.appendChild(row);
    }
    
    // Initially hide opponent game container
    this.opponentGameContainer.style.display = 'none';
  }
  
  createRoom(mode, password) {
    this.gameMode = mode;
    this.socket.send(JSON.stringify({
      action: 'create_room',
      mode: mode,
      password: password
    }));
  }
  
  joinRoom(roomNumber, password) {
    this.socket.send(JSON.stringify({
      action: 'join_room',
      room_number: roomNumber,
      password: password
    }));
  }
  
  listRooms() {
    this.socket.send(JSON.stringify({
      action: 'list_rooms'
    }));
  }
  
  startGame() {
    this.socket.send(JSON.stringify({
      action: 'start_game',
      room_number: this.currentRoom
    }));
  }
  
  sendMove(grid, score) {
    if (this.currentRoom) {
      this.socket.send(JSON.stringify({
        action: 'move',
        room_number: this.currentRoom,
        grid: grid,
        score: score
      }));
    }
  }
  
  handleServerMessage(data) {
    switch (data.action) {
      case 'room_created':
        this.currentRoom = data.room_number;
        this.isHost = true;
        this.multiplayerMenu.style.display = 'none';
        this.opponentGameContainer.style.display = 'block';
        this.roomNumberDisplay.textContent = `Room: ${this.currentRoom}`;
        this.opponentScoreDisplay.textContent = 'Waiting for opponent...';
        break;
        
      case 'room_joined':
        this.currentRoom = data.room_number;
        this.multiplayerMenu.style.display = 'none';
        this.opponentGameContainer.style.display = 'block';
        this.roomNumberDisplay.textContent = `Room: ${this.currentRoom}`;
        break;
        
      case 'player_joined':
        this.opponentScoreDisplay.textContent = 'Opponent joined!';
        if (this.isHost) {
          // Show start button
          const startBtn = document.createElement('button');
          startBtn.textContent = 'Start Game';
          startBtn.style.cssText = `
            margin: 10px auto;
            display: block;
            padding: 10px 20px;
            background: #8f7a66;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          `;
          startBtn.addEventListener('click', () => {
            this.startGame();
            startBtn.remove();
          });
          this.opponentGameContainer.appendChild(startBtn);
        }
        break;
        
      case 'game_started':
        this.opponentScoreDisplay.textContent = 'Opponent: 0';
        // Initialize opponent grid
        this.opponentGrid = Array(4).fill().map(() => Array(4).fill(null));
        break;
        
      case 'opponent_move':
        this.opponentGrid = data.grid.cells;
        this.opponentScore = data.score;
        this.opponentScoreDisplay.textContent = `Opponent: ${this.opponentScore}`;
        this.updateOpponentGrid();
        break;
        
      case 'join_failed':
        alert('Join failed: ' + data.reason);
        break;
        
      case 'rooms_list':
        const roomsContainer = document.getElementById('roomsContainer');
        roomsContainer.innerHTML = '';
        if (data.rooms.length === 0) {
          roomsContainer.innerHTML = '<p>No available rooms</p>';
          return;
        }
        data.rooms.forEach(room => {
          const roomElement = document.createElement('div');
          roomElement.style.cssText = `
            padding: 5px;
            margin-bottom: 5px;
            background: #eee;
            border-radius: 5px;
            cursor: pointer;
          `;
          roomElement.innerHTML = `
            <strong>${room.room_number}</strong> - ${room.player_count} players - ${room.mode}
          `;
          roomElement.addEventListener('click', () => {
            if (this.isSpectating) {
              this.joinRoom(room.room_number, '');
            } else {
              document.getElementById('roomNumber').value = room.room_number;
              document.getElementById('roomForm').style.display = 'block';
              document.getElementById('roomList').style.display = 'none';
            }
          });
          roomsContainer.appendChild(roomElement);
        });
        break;
    }
  }
  
  updateOpponentGrid() {
    // Clear existing tiles
    this.opponentTileContainer.innerHTML = '';
    
    // Update tiles
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const tile = this.opponentGrid[i][j];
        if (tile) {
          const tileElement = document.createElement('div');
          tileElement.style.cssText = `
            position: absolute;
            left: ${j * 50 + 5}px;
            top: ${i * 50 + 5}px;
            width: 40px;
            height: 40px;
            line-height: 40px;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            border-radius: 3px;
            background: #eee4da;
            color: #776e65;
            z-index: 10;
          `;
          tileElement.textContent = tile.value;
          this.opponentTileContainer.appendChild(tileElement);
        }
      }
    }
  }
}

// Initialize multiplayer manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.multiplayerManager = new MultiplayerManager();
});