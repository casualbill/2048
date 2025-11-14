# Server configuration
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8765

# Game configuration
MAX_PLAYERS_PER_ROOM = 4
ROOM_ID_LENGTH = 6

# WebSocket settings
WS_MAX_SIZE = 2 ** 20  # 1MB
WS_TIMEOUT = 60  # seconds
WS_PING_INTERVAL = 20  # seconds

# Database settings (placeholder for future implementation)
DATABASE_URL = 'sqlite:///2048.db'

# Logging settings
LOG_LEVEL = 'INFO'