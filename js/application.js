// WebLLM AI Module
let aiEngine = null;
let aiMode = 'none'; // 'none', 'auto', 'suggest', 'assist'
let aiSpeed = 'medium'; // 'fast', 'medium', 'slow'
let aiStats = { highestScore: 0, averageScore: 0, gamesPlayed: 0, achieved2048: 0 };

// Initialize WebLLM engine
async function initAIEngine() {
  try {
    if (typeof webllm === 'undefined') {
      // WebLLM library not loaded yet
      // In a real implementation, we would load the WebLLM library here
      // For this demo, we'll simulate a simple AI
      console.log('WebLLM library not available. Using simple AI simulation.');
      return;
    }
    
    const appConfig = {
      model_list: [
        {
          model: "https://huggingface.co/mlc-ai/qwen3-8b-instruct-q4f16_1-mlc",
          model_lib: "https://huggingface.co/mlc-ai/qwen3-8b-instruct-q4f16_1-mlc/resolve/main/qwen3-8b-instruct-q4f16_1-mlc.wasm",
        },
      ],
    };
    
    aiEngine = await webllm.CreateMLCEngine(appConfig, {
      initProgressCallback: (progress) => {
        console.log('AI model loading progress:', progress);
      },
    });
    
    console.log('AI engine initialized successfully');
  } catch (error) {
    console.error('Error initializing AI engine:', error);
  }
}

// Simulate AI move (for demo purposes)
function getAIMove(board) {
  // In a real implementation, we would send the board to the AI model
  // For this demo, we'll use a simple heuristic
  const directions = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  // Initialize AI engine
  initAIEngine();
});
