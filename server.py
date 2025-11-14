import asyncio
import websockets
import json
import random
import uuid
import datetime

# Load configuration
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8765
MAX_PLAYERS_PER_ROOM = 4
ROOM_ID_LENGTH = 6

# 房间列表，键是房间号，值是房间信息（玩家列表、对战模式、状态等）
rooms = {}
# 玩家列表，键是websocket连接，值是玩家信息（昵称、房间号、角色等）
players = {}

# 生成6位唯一房间号
def generate_room_id():
    while True:
        room_id = str(random.randint(100000, 999999))
        if room_id not in rooms:
            return room_id

async def handle_client(websocket, path):
    player_id = str(uuid.uuid4())[:8]
    player = {
        'id': player_id,
        'nickname': f'Player_{player_id}',
        'room_id': None,
        'score': 0,
        'is_host': False,
        'role': 'player'  # player, spectator
    }
    players[websocket] = player
    
    print(f'New client connected: {player_id}')
    
    try:
        async for message in websocket:
            data = json.loads(message)
            command = data.get('command')
            print(f'Received command: {command} from {player_id}')
            
            if command == 'create_room':
                await create_room(websocket, data)
            elif command == 'join_room':
                await join_room(websocket, data)
            elif command == 'list_rooms':
                await list_rooms(websocket)
            elif command == 'start_game':
                await start_game(websocket, data)
            elif command == 'move':
                await handle_move(websocket, data)
            elif command == 'update_score':
                await update_score(websocket, data)
            elif command == 'game_over':
                await game_over(websocket, data)
            elif command == 'leave_room':
                await leave_room(websocket)
            elif command == 'spectate_room':
                await spectate_room(websocket, data)
    except websockets.exceptions.ConnectionClosed:
        print(f'Client disconnected: {player_id}')
    finally:
        await cleanup_player(websocket)

async def create_room(websocket, data):
    player = players[websocket]
    room_id = generate_room_id()
    mode = data.get('mode', 'race')  # 默认竞速模式
    password = data.get('password', '')
    
    room = {
        'id': room_id,
        'mode': mode,
        'password': password,
        'players': [player['id']],
        'spectators': [],
        'host_id': player['id'],
        'status': 'waiting',  # waiting, playing, finished
        'game_state': None,
        'start_time': None,
        'end_time': None
    }
    
    rooms[room_id] = room
    player['room_id'] = room_id
    player['is_host'] = True
    
    await websocket.send(json.dumps({
        'type': 'room_created',
        'room_id': room_id,
        'mode': mode
    }))

async def join_room(websocket, data):
    player = players[websocket]
    room_id = data.get('room_id')
    password = data.get('password', '')
    
    if room_id not in rooms:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Room not found'
        }))
        return
    
    room = rooms[room_id]
    
    # 检查密码
    if room['password'] != password:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Incorrect password'
        }))
        return
    
    # 检查房间状态
    if room['status'] == 'playing':
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Game already started'
        }))
        return
    
    # 检查房间人数
    if len(room['players']) >= MAX_PLAYERS_PER_ROOM:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Room is full'
        }))
        return
    
    # 加入房间
    room['players'].append(player['id'])
    player['room_id'] = room_id
    player['is_host'] = False
    
    # 通知房间内所有玩家
    await broadcast_to_room(room_id, json.dumps({
        'type': 'player_joined',
        'player_id': player['id'],
        'nickname': player['nickname'],
        'player_count': len(room['players'])
    }))
    
    await websocket.send(json.dumps({
        'type': 'room_joined',
        'room_id': room_id,
        'mode': room['mode'],
        'players': room['players']
    }))

async def list_rooms(websocket):
    # 只返回等待中的房间
    waiting_rooms = []
    for room_id, room in rooms.items():
        if room['status'] == 'waiting':
            waiting_rooms.append({
                'room_id': room_id,
                'mode': room['mode'],
                'player_count': len(room['players']),
                'has_password': room['password'] != ''
            })
    
    await websocket.send(json.dumps({
        'type': 'room_list',
        'rooms': waiting_rooms
    }))

async def start_game(websocket, data):
    player = players[websocket]
    room_id = player['room_id']
    
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    
    # 检查是否是房主
    if room['host_id'] != player['id']:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Only host can start game'
        }))
        return
    
    # 检查房间人数
    if len(room['players']) < 2:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Need at least 2 players to start'
        }))
        return
    
    room['status'] = 'playing'
    room['start_time'] = datetime.datetime.now().isoformat()
    
    # 通知所有玩家游戏开始
    await broadcast_to_room(room_id, json.dumps({
        'type': 'game_started',
        'start_time': room['start_time'],
        'mode': room['mode']
    }))

async def handle_move(websocket, data):
    player = players[websocket]
    room_id = player['room_id']
    
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    
    # 检查游戏状态
    if room['status'] != 'playing':
        return
    
    # 广播移动信息
    move_data = {
        'type': 'player_move',
        'player_id': player['id'],
        'direction': data.get('direction'),
        'game_state': data.get('game_state'),
        'score': data.get('score'),
        'time': datetime.datetime.now().isoformat()
    }
    
    await broadcast_to_room(room_id, json.dumps(move_data))

async def update_score(websocket, data):
    player = players[websocket]
    room_id = player['room_id']
    new_score = data.get('score', 0)
    
    player['score'] = new_score
    
    if room_id not in rooms:
        return
    
    await broadcast_to_room(room_id, json.dumps({
        'type': 'score_updated',
        'player_id': player['id'],
        'score': new_score
    }))

async def game_over(websocket, data):
    player = players[websocket]
    room_id = player['room_id']
    
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    result = data.get('result', 'lost')
    
    await broadcast_to_room(room_id, json.dumps({
        'type': 'player_game_over',
        'player_id': player['id'],
        'result': result,
        'score': player['score']
    }))

async def leave_room(websocket):
    player = players[websocket]
    room_id = player['room_id']
    
    if room_id and room_id in rooms:
        room = rooms[room_id]
        
        # 从玩家列表或观众列表中移除
        if player['id'] in room['players']:
            room['players'].remove(player['id'])
        elif player['id'] in room['spectators']:
            room['spectators'].remove(player['id'])
        
        # 如果是房主并且还有其他玩家，选第一个玩家为新房主
        if player['id'] == room['host_id'] and len(room['players']) > 0:
            new_host_id = room['players'][0]
            room['host_id'] = new_host_id
            
            # 更新新房主信息
            for ws, p in players.items():
                if p['id'] == new_host_id:
                    p['is_host'] = True
                    await ws.send(json.dumps({
                        'type': 'become_host'
                    }))
                    break
        
        # 广播离开信息
        await broadcast_to_room(room_id, json.dumps({
            'type': 'player_left',
            'player_id': player['id'],
            'player_count': len(room['players'])
        }))
        
        # 如果房间没人了，删除房间
        if len(room['players']) == 0 and len(room['spectators']) == 0:
            del rooms[room_id]
    
    player['room_id'] = None
    player['is_host'] = False
    player['role'] = 'player'

async def spectate_room(websocket, data):
    player = players[websocket]
    room_id = data.get('room_id')
    
    if room_id not in rooms:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': 'Room not found'
        }))
        return
    
    room = rooms[room_id]
    
    # 加入观众列表
    room['spectators'].append(player['id'])
    player['room_id'] = room_id
    player['role'] = 'spectator'
    
    await websocket.send(json.dumps({
        'type': 'spectate_started',
        'room_id': room_id,
        'mode': room['mode'],
        'players': room['players'],
        'game_state': room['game_state']
    }))

async def broadcast_to_room(room_id, message):
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    
    # 发送给所有玩家和观众
    for ws, player in players.items():
        if player['room_id'] == room_id:
            try:
                await ws.send(message)
            except:
                pass

async def cleanup_player(websocket):
    if websocket in players:
        await leave_room(websocket)
        del players[websocket]

async def main():
    print(f'Starting WebSocket server on {SERVER_HOST}:{SERVER_PORT}')
    async with websockets.serve(handle_client, SERVER_HOST, SERVER_PORT):
        await asyncio.Future()  # run forever

if __name__ == '__main__':
    asyncio.run(main())