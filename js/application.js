// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
});

// Initialize AI using global webllm object
const aiStatus = document.getElementById('ai-status');
aiStatus.textContent = 'AI加载中: 等待WebLLM库加载';

function checkWebLLMLoaded() {
  if (typeof webllm !== 'undefined') {
    console.log('WebLLM library loaded successfully');
    initializeAI(webllm.CreateMLCEngine);
  } else {
    console.log('WebLLM library not loaded yet, retrying...');
    setTimeout(checkWebLLMLoaded, 1000);
  }
}

checkWebLLMLoaded();

// AI initialization logic
let aiMode = 'off';
let aiSpeed = 'medium';
let aiPlaying = false;
let aiStatistics = {
  highestScore: 0,
  averageScore: 0,
  gamesPlayed: 0,
  achieved2048: 0
};
let getAIDecision = async (gameState) => { return { direction: '上', reason: 'AI尚未初始化' }; };

function initializeAI(CreateMLCEngine) {
  const aiStatus = document.getElementById('ai-status');
  aiStatus.textContent = 'AI加载中...';

  // WebLLM configuration - use a smaller model for faster loading
  const initConfig = {
    model: 'qwen2-1.5b-chat-q4f32_1-MLC'
  };

  // Create MLCEngine with progress callback
  CreateMLCEngine(initConfig, { 
    initProgressCallback: (report) => {
      aiStatus.textContent = `AI加载中: ${report.text}`;
    }
  }).then((engine) => {
    aiStatus.textContent = 'AI已就绪';
    
    // Set global getAIDecision function to use the engine
    getAIDecision = async function(gameState) {
      // Format prompt
      const prompt = `你现在是2048游戏的AI玩家，请根据当前棋盘状态给出最佳移动方向（上/下/左/右）和理由。
游戏规则：相同数字的方块相撞时会合并成它们的和，每次移动后会在空白处随机生成一个2或4的方块，当无法移动时游戏结束，目标是获得尽可能高的分数。
当前棋盘状态（4x4矩阵，0表示空白）：
${JSON.stringify(gameState.grid)}
请按照以下格式回答：
方向：上
理由：[你的理由]`;
      
      // Get response from WebLLM
      const response = await engine.generate(prompt, {
        temperature: 0.1,
        max_new_tokens: 50
      });
      
      // Parse response
      const directionMatch = response.match(/方向：(上|下|左|右)/);
      const reasonMatch = response.match(/理由：([\s\S]*)/);
      
      let direction = '上'; // Default to up
      let reason = '无法解析AI响应';
      
      if (directionMatch) direction = directionMatch[1];
      if (reasonMatch) reason = reasonMatch[1].trim();
      
      return { direction, reason };
    }
    
    // Call setupAIControls
    setupAIControls();
  }).catch((err) => {
    aiStatus.textContent = 'AI加载失败: ' + err.message;
  });

  // Setup AI controls
  function setupAIControls() {
    // AI mode buttons
    const aiModeButtons = document.querySelectorAll('.ai-mode-button');
    const aiSpeedControls = document.querySelector('.ai-speed-controls');
    
    // Mode selection
    aiModeButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Remove active class from all buttons
        aiModeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to current button
        this.classList.add('active');
        
        // Set AI mode
        aiMode = this.id.replace('ai-mode-', '');
        
        // Show/hide speed controls
        aiSpeedControls.style.display = (aiMode === 'auto') ? 'block' : 'none';
        
        // Stop AI if switching from auto mode
        if (aiMode !== 'auto' && aiPlaying) {
          aiPlaying = false;
        }
        
        // Start AI if switching to auto mode
        if (aiMode === 'auto' && !aiPlaying) {
          aiPlaying = true;
          aiAutoPlay();
        }
      });
    });
    
    // AI speed buttons
    const aiSpeedButtons = document.querySelectorAll('.ai-speed-button');
    aiSpeedButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Remove active class from all buttons
        aiSpeedButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to current button
        this.classList.add('active');
        
        // Set AI speed
        aiSpeed = this.id.replace('ai-speed-', '');
      });
    });
    
    // Set default speed
    document.getElementById('ai-speed-medium').classList.add('active');
  }

  // AI auto play logic
  async function aiAutoPlay() {
    while (aiPlaying && aiMode === 'auto') {
      // Get current game state
      const gameState = getCurrentGameState();
      
      if (!gameState) break;
      
      // If game is over, stop
      if (gameState.over) {
        aiPlaying = false;
        updateAIStatistics(gameState);
        break;
      }
      
      // Get AI decision
      const { direction, reason } = await getAIDecision(gameState);
      
      // Display AI advice
      displayAIAdvice(direction, reason);
      
      // Execute move
      executeMove(direction);
      
      // Wait according to speed
      let delay;
      switch(aiSpeed) {
        case 'slow': delay = 1500; break;
        case 'medium': delay = 1000; break;
        case 'fast': delay = 500; break;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Get current game state
  function getCurrentGameState() {
    // Get grid container
    const gridContainer = document.querySelector('.grid-container');
    
    // Create grid matrix
    const grid = [];
    const gridRows = gridContainer.querySelectorAll('.grid-row');
    
    gridRows.forEach((row, rowIndex) => {
      grid[rowIndex] = [];
      const gridCells = row.querySelectorAll('.grid-cell');
      
      gridCells.forEach((cell, colIndex) => {
        // Find tile in this cell
        const tile = cell.querySelector('.tile');
        if (tile) {
          grid[rowIndex][colIndex] = parseInt(tile.textContent);
        } else {
          grid[rowIndex][colIndex] = 0;
        }
      });
    });
    
    // Get current score
    const score = parseInt(document.querySelector('.score-container').textContent);
    
    // Check if game is over
    const gameMessage = document.querySelector('.game-message');
    const isOver = gameMessage.style.display === 'block' && gameMessage.classList.contains('game-over');
    
    return {
      grid,
      score,
      over: isOver
    };
  }

  // Display AI advice
  function displayAIAdvice(direction, reason) {
    // Create advice element if not exists
    let aiAdviceElement = document.querySelector('.ai-advice');
    if (!aiAdviceElement) {
      aiAdviceElement = document.createElement('div');
      aiAdviceElement.className = 'ai-advice';
      document.querySelector('.game-container').appendChild(aiAdviceElement);
    }
    
    // Update advice content
    aiAdviceElement.textContent = `AI建议：${direction} - ${reason}`;
  }

  // Execute move
  function executeMove(direction) {
    // Simulate arrow key press
    const keyCodeMap = {
      '上': 38,
      '下': 40,
      '左': 37,
      '右': 39
    };
    
    const event = new KeyboardEvent('keydown', {
      keyCode: keyCodeMap[direction],
      which: keyCodeMap[direction]
    });
    
    document.dispatchEvent(event);
  }

  // Update AI statistics
  function updateAIStatistics(gameState) {
    // Update games played
    aiStatistics.gamesPlayed++;
    
    // Update highest score
    if (gameState.score > aiStatistics.highestScore) {
      aiStatistics.highestScore = gameState.score;
    }
    
    // Update average score
    aiStatistics.averageScore = Math.round(
      (aiStatistics.averageScore * (aiStatistics.gamesPlayed - 1) + gameState.score) / aiStatistics.gamesPlayed
    );
    
    // Check if achieved 2048
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      if (parseInt(tile.textContent) === 2048) {
        aiStatistics.achieved2048++;
      }
    });
    
    // Display statistics
    alert(`AI游戏统计：
最高分：${aiStatistics.highestScore}
平均分：${aiStatistics.averageScore}
达成2048次数：${aiStatistics.achieved2048}
总游戏次数：${aiStatistics.gamesPlayed}`);
  }
}
