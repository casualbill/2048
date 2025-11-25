import asyncio
import websockets
import json
import random
import string
from collections import defaultdict

# Game rooms storage
rooms = {}
# Connected clients
clients = set()

# Generate a random 6-digit room number
def generate_room_number():
    return ''.join(random.choices(string.digits, k=6))

# Handle client connections
async def handle_client(websocket, path):
    clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            action = data.get('action')
            
            if action == 'create_room':
                # Create a new room
                room_number = generate_room_number()
                # Ensure room number is unique
                while room_number in rooms:
                    room_number = generate_room_number()
                rooms[room_number] = {
                    'players': [],
                    'game_state': None,
                    'host': websocket,
                    'password': data.get('password', ''),
                    'mode': data.get('mode', 'timed'),
                    'started': False
                }
                await websocket.send(json.dumps({
                    'action': 'room_created',
                    'room_number': room_number
                }))
                
            elif action == 'join_room':
                # Join an existing room
                room_number = data.get('room_number')
                password = data.get('password', '')
                
                if room_number in rooms:
                    room = rooms[room_number]
                    if room['password'] == password and not room['started']:
                        room['players'].append(websocket)
                        await websocket.send(json.dumps({
                            'action': 'room_joined',
                            'room_number': room_number
                        }))
                        # Notify other players in the room
                        for player in room['players']:
                            if player != websocket:
                                await player.send(json.dumps({
                                    'action': 'player_joined',
                                    'player_count': len(room['players'])
                                }))
                    else:
                        await websocket.send(json.dumps({
                            'action': 'join_failed',
                            'reason': 'Invalid password or game already started'
                        }))
                else:
                    await websocket.send(json.dumps({
                        'action': 'join_failed',
                        'reason': 'Room not found'
                    }))
                    
            elif action == 'start_game':
                # Start the game
                room_number = data.get('room_number')
                if room_number in rooms:
                    room = rooms[room_number]
                    if websocket == room['host'] and len(room['players']) >= 2:
                        room['started'] = True
                        # Notify all players to start the game
                        for player in room['players'] + [room['host']]:
                            await player.send(json.dumps({
                                'action': 'game_started',
                                'mode': room['mode']
                            }))
                            
            elif action == 'move':
                # Handle game move
                room_number = data.get('room_number')
                grid = data.get('grid')
                score = data.get('score')
                
                if room_number in rooms:
                    room = rooms[room_number]
                    # Broadcast move to other players
                    for player in room['players'] + [room['host']]:
                        if player != websocket:
                            await player.send(json.dumps({
                                'action': 'opponent_move',
                                'grid': grid,
                                'score': score
                            }))
                            
            elif action == 'list_rooms':
                # List all available rooms
                available_rooms = []
                for room_number, room in rooms.items():
                    if not room['started']:
                        available_rooms.append({
                            'room_number': room_number,
                            'player_count': len(room['players']) + 1,  # +1 for host
                            'mode': room['mode']
                        })
                await websocket.send(json.dumps({
                    'action': 'rooms_list',
                    'rooms': available_rooms
                }))
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Remove client from rooms and clients set
        for room_number, room in rooms.items():
            if websocket in room['players']:
                room['players'].remove(websocket)
            if websocket == room['host']:
                # If host leaves, remove the room
                del rooms[room_number]
        clients.discard(websocket)

# Start the WebSocket server
async def main():
    print('Starting WebSocket server on ws://localhost:8767')
    async with websockets.serve(handle_client, 'localhost', 8767):
        print('Server started successfully')
        await asyncio.Future()  # Run forever

asyncio.run(main())