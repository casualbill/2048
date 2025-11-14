class MultiplayerManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.socket = null;
    this.isConnected = false;
    this.roomId = null;
    this.isHost = false;
    this.opponents = [];
    this.mode = null;
    this.isPlaying = false;
    this.role = 'player'; // player or spectator
    
    this.initModal();
  }
  
  initModal() {
    // 获取DOM元素
    this.modal = document.getElementById('multiplayer-modal');
    this.createRoomBtn = document.getElementById('create-room-btn');
    this.joinRoomBtn = document.getElementById('join-room-btn');
    this.spectateBtn = document.getElementById('spectate-btn');
    this.closeModalBtn = document.querySelector('.close-modal');
    this.createRoomForm = document.getElementById('create-room-form');
    this.joinRoomForm = document.getElementById('join-room-form');
    this.spectateForm = document.getElementById('spectate-form');
    this.roomList = document.getElementById('room-list');
    
    // 初始化表单
    this.roomModeSelect = document.getElementById('room-mode');
    this.roomPasswordInput = document.getElementById('room-password');
    this.createRoomSubmit = document.getElementById('create-room-submit');
    
    this.joinRoomIdInput = document.getElementById('join-room-id');
    this.joinRoomPasswordInput = document.getElementById('join-room-password');
    this.joinRoomSubmit = document.getElementById('join-room-submit');
    
    this.spectateRoomIdInput = document.getElementById('spectate-room-id');
    this.spectateSubmit = document.getElementById('spectate-submit');
    
    // 添加事件监听
    document.querySelector('.multiplayer-button').addEventListener('click', () => {
      this.showModal();
    });
    
    this.closeModalBtn.addEventListener('click', () => {
      this.hideModal();
    });
    
    window.addEventListener('click', (e) => {
      if (e.target == this.modal) {
        this.hideModal();
      }
    });
    
    this.createRoomBtn.addEventListener('click', () => {
      this.showForm('create');
    });
    
    this.joinRoomBtn.addEventListener('click', () => {
      this.showForm('join');
    });
    
    this.spectateBtn.addEventListener('click', () => {
      this.showForm('spectate');
    });
    
    this.createRoomSubmit.addEventListener('click', () => {
      this.createRoom();
    });
    
    this.joinRoomSubmit.addEventListener('click', () => {
      this.joinRoom();
    });
    
    this.spectateSubmit.addEventListener('click', () => {
      this.spectateRoom();
    });
  }
  
  showModal() {
    this.modal.style.display = 'block';
    this.showForm('none');
  }
  
  hideModal() {
    this.modal.style.display = 'none';
    this.showForm('none');
  }
  
  showForm(type) {
    // 隐藏所有表单
    this.createRoomForm.style.display = 'none';
    this.joinRoomForm.style.display = 'none';
    this.spectateForm.style.display = 'none';
    this.roomList.style.display = 'none';
    
    // 显示选中的表单
    if (type === 'create') {
      this.createRoomForm.style.display = 'block';
    } else if (type === 'join') {
      this.joinRoomForm.style.display = 'block';
      this.roomList.style.display = 'block';
      this.loadRooms();
    } else if (type === 'spectate') {
      this.spectateForm.style.display = 'block';
      this.roomList.style.display = 'block';
      this.loadRooms();
    }
  }
  
  async connect() {
    try {
      // 连接到WebSocket服务器
      this.socket = new WebSocket('ws://localhost:8765');
      
      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('WebSocket connected');
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.socket.onclose = () => {
        this.isConnected = false;
        console.log('WebSocket disconnected');
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect to WebSocket server:', error);
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
  
  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    }
  }
  
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'room_created':
          this.handleRoomCreated(message);
          break;
        case 'room_joined':
          this.handleRoomJoined(message);
          break;
        case 'player_joined':
          this.handlePlayerJoined(message);
          break;
        case 'player_left':
          this.handlePlayerLeft(message);
          break;
        case 'game_started':
          this.handleGameStarted(message);
          break;
        case 'player_move':
          this.handlePlayerMove(message);
          break;
        case 'score_updated':
          this.handleScoreUpdated(message);
          break;
        case 'player_game_over':
          this.handlePlayerGameOver(message);
          break;
        case 'room_list':
          this.handleRoomList(message);
          break;
        case 'error':
          this.handleError(message);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }
  
  createRoom() {
    const mode = this.roomModeSelect.value;
    const password = this.roomPasswordInput.value;
    
    if (!this.socket || !this.isConnected) {
      this.connect().then(() => {
        this.sendMessage({
          command: 'create_room',
          mode: mode,
          password: password
        });
      });
    } else {
      this.sendMessage({
        command: 'create_room',
        mode: mode,
        password: password
      });
    }
  }
  
  joinRoom() {
    const roomId = this.joinRoomIdInput.value;
    const password = this.joinRoomPasswordInput.value;
    
    if (!roomId) {
      alert('Please enter room ID');
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      this.connect().then(() => {
        this.sendMessage({
          command: 'join_room',
          room_id: roomId,
          password: password
        });
      });
    } else {
      this.sendMessage({
        command: 'join_room',
        room_id: roomId,
        password: password
      });
    }
  }
  
  spectateRoom() {
    const roomId = this.spectateRoomIdInput.value;
    
    if (!roomId) {
      alert('Please enter room ID');
      return;
    }
    
    if (!this.socket || !this.isConnected) {
      this.connect().then(() => {
        this.sendMessage({
          command: 'spectate_room',
          room_id: roomId
        });
      });
    } else {
      this.sendMessage({
        command: 'spectate_room',
        room_id: roomId
      });
    }
  }
  
  loadRooms() {
    if (!this.socket || !this.isConnected) {
      this.connect().then(() => {
        this.sendMessage({ command: 'list_rooms' });
      });
    } else {
      this.sendMessage({ command: 'list_rooms' });
    }
  }
  
  handleRoomCreated(message) {
    this.roomId = message.room_id;
    this.mode = message.mode;
    this.isHost = true;
    
    alert(`Room created successfully! Room ID: ${this.roomId}`);
    this.hideModal();
    
    // TODO: Show room waiting screen
  }
  
  handleRoomJoined(message) {
    this.roomId = message.room_id;
    this.mode = message.mode;
    this.isHost = false;
    
    alert('Joined room successfully!');
    this.hideModal();
    
    // TODO: Show room waiting screen
  }
  
  handlePlayerJoined(message) {
    console.log('Player joined:', message.player_id);
    
    // TODO: Update room UI
  }
  
  handlePlayerLeft(message) {
    console.log('Player left:', message.player_id);
    
    // TODO: Update room UI
  }
  
  handleGameStarted(message) {
    this.isPlaying = true;
    
    console.log('Game started! Mode:', message.mode);
    
    // TODO: Start multiplayer game
  }
  
  handlePlayerMove(message) {
    if (message.player_id === this.playerId) {
      return; // Ignore own moves
    }
    
    console.log('Opponent move:', message);
    
    // TODO: Update opponent's board
  }
  
  handleScoreUpdated(message) {
    console.log('Score updated:', message);
    
    // TODO: Update UI with new scores
  }
  
  handlePlayerGameOver(message) {
    console.log('Player game over:', message);
    
    // TODO: Handle game over
  }
  
  handleRoomList(message) {
    const roomsContainer = document.getElementById('rooms-container');
    roomsContainer.innerHTML = '';
    
    if (message.rooms.length === 0) {
      roomsContainer.innerHTML = '<p>No available rooms</p>';
      return;
    }
    
    message.rooms.forEach(room => {
      const roomItem = document.createElement('div');
      roomItem.className = 'room-item';
      
      const passwordText = room.has_password ? '🔒' : '🔓';
      roomItem.innerHTML = `
        <strong>Room ${room.room_id}</strong> - ${room.mode}
        <br>
        Players: ${room.player_count}/4 ${passwordText}
      `;
      
      roomItem.addEventListener('click', () => {
        // 自动填充房间ID到输入框
        if (this.joinRoomIdInput) {
          this.joinRoomIdInput.value = room.room_id;
        }
        if (this.spectateRoomIdInput) {
          this.spectateRoomIdInput.value = room.room_id;
        }
      });
      
      roomsContainer.appendChild(roomItem);
    });
  }
  
  handleError(message) {
    alert(`Error: ${message.message}`);
  }
  
  // Game integration methods
  sendMove(direction) {
    if (!this.isPlaying || !this.socket || !this.isConnected) {
      return;
    }
    
    const gameState = this.gameManager.serialize();
    
    this.sendMessage({
      command: 'move',
      direction: direction,
      game_state: gameState,
      score: gameState.score
    });
  }
  
  updateScore(score) {
    if (!this.isPlaying || !this.socket || !this.isConnected) {
      return;
    }
    
    this.sendMessage({
      command: 'update_score',
      score: score
    });
  }
  
  gameOver(result) {
    if (!this.isPlaying || !this.socket || !this.isConnected) {
      return;
    }
    
    this.sendMessage({
      command: 'game_over',
      result: result
    });
    
    this.isPlaying = false;
  }
}

// 导出MultiplayerManager类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiplayerManager;
} else {
  window.MultiplayerManager = MultiplayerManager;
}