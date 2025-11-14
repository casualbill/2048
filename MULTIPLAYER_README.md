# 2048 多人联机功能说明

## 功能介绍

### 1. 联机对战模式
- **创建房间**：自动生成6位数字房间号，可设置密码
- **加入房间**：通过房间号和密码加入现有房间
- **观战模式**：观看他人游戏

### 2. 对战模式
- **竞速模式**：率先合成2048的玩家获胜
- **计时模式**：3分钟内分数高者获胜
- **淘汰模式**：每1分钟淘汰分数最低者
- **组队模式**：2-3人组队，队伍得分累加

### 3. 游戏界面
- 分屏显示本地和对手棋盘
- 显示玩家昵称、分数和游戏状态
- 实时显示网络延迟和连接状态

## 快速开始

### 服务器部署

#### 方式1：直接运行Python服务器
```bash
# 安装依赖
pip install websockets

# 启动服务器
python server.py
```

#### 方式2：使用Docker部署
```bash
# 构建镜像
docker build -t 2048-server .

# 运行容器
docker run -p 8765:8765 2048-server
```

#### 方式3：使用Docker Compose
```bash
docker-compose up -d
```

### 客户端使用

1. 启动HTTP服务器（默认端口8080）：
```bash
python -m http.server 8080
```

2. 在浏览器中打开 `http://localhost:8080`

3. 点击"Multiplayer"按钮进入多人游戏界面

4. 选择创建房间、加入房间或观战模式

## 开发说明

### 技术栈
- **前端**：原生JavaScript、HTML5、CSS3
- **后端**：Python 3.11 + WebSocket
- **容器**：Docker

### 文件结构

```
2048/
├── js/
│   ├── multiplayer.js      # 多人游戏逻辑
│   └── ...                 # 原有游戏文件
├── style/
│   ├── main.css           # 添加了模态框和多人游戏样式
│   └── ...
├── server.py              # WebSocket服务器
├── Dockerfile            # Docker配置
├── docker-compose.yml    # Docker Compose配置
└── index.html            # 添加了多人游戏模态框
```

### WebSocket API

#### 客户端到服务器消息
- `create_room`: 创建房间
- `join_room`: 加入房间
- `list_rooms`: 获取房间列表
- `start_game`: 开始游戏
- `move`: 发送移动操作
- `update_score`: 更新分数
- `game_over`: 游戏结束
- `leave_room`: 离开房间
- `spectate_room`: 观战房间

#### 服务器到客户端消息
- `room_created`: 房间创建成功
- `room_joined`: 房间加入成功
- `player_joined`: 玩家加入通知
- `player_left`: 玩家离开通知
- `game_started`: 游戏开始通知
- `player_move`: 玩家移动通知
- `score_updated`: 分数更新通知
- `player_game_over`: 玩家游戏结束通知
- `room_list`: 房间列表
- `error`: 错误信息

## 性能优化

- 使用WebSocket实现低延迟通信（目标延迟<100ms）
- 仅传输必要的游戏状态数据
- 优化JSON序列化/反序列化
- 使用异步处理提高服务器并发能力

## 注意事项

1. 确保服务器和客户端在同一网络或服务器可公开访问
2. 默认端口：
   - HTTP服务器：8080
   - WebSocket服务器：8765
3. 支持最多4人同时游戏
4. 游戏开始后无法加入新玩家

## 未来改进

- 添加用户认证系统
- 实现更丰富的游戏统计
- 添加聊天功能
- 支持移动端适配优化
- 添加更多游戏模式

## 开发团队

由Trae AI协助开发。