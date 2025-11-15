# 2048游戏扩展功能

## 1. 操作记录
游戏会记录每一步操作的详细信息：
- 方向：0(上), 1(右), 2(下), 3(左)
- 时间戳：操作发生的时间
- 得分变化：该步操作导致的得分变化
- 游戏时间：从开始到当前操作的耗时

所有记录会在游戏结束时自动上传到后端服务器。

## 2. Go后端API

### 接口列表

#### POST /api/v1/game/record
提交游戏记录

**请求体：**
```json
{
  "player_name": "Player1",
  "score": 2048,
  "game_time": 123456,
  "operations": [
    {
      "direction": 1,
      "timestamp": 1234567890,
      "score": 4,
      "score_change": 2,
      "game_time_elapsed": 1000
    }
  ],
  "size": 4,
  "won": true,
  "over": true
}
```

#### GET /api/v1/game/leaderboard/score
获取最高分排行榜（前100名）

#### GET /api/v1/game/leaderboard/time
获取最快速度排行榜（仅胜利游戏，前100名）

#### GET /api/v1/game/player/:player_name
获取玩家历史记录

**参数：**
- page: 页码，默认1
- page_size: 每页大小，默认10，最大50

## 3. 排行榜功能

### 最高分排行榜
- 按得分降序排列
- 相同得分按时间升序排列
- 显示前100名玩家

### 最快速度排行榜
- 仅显示胜利的游戏
- 按游戏时间升序排列
- 相同时间按时间升序排列
- 显示前100名玩家

## 4. Docker部署

使用docker-compose部署四个服务：
1. frontend: Nginx提供前端静态文件
2. backend: Go后端API服务
3. postgres: PostgreSQL数据库
4. redis: Redis缓存

### 部署步骤

1. 克隆项目：
```bash
git clone <repo-url>
cd 2048
```

2. 启动服务：
```bash
docker-compose up -d
```

3. 访问游戏：
```
http://localhost
```

## 5. Travis CI

配置了自动化测试和部署：
- 仅在main分支触发
- 运行后端测试
- 构建Docker镜像
- 部署到生产环境（需配置Heroku）

## 6. 前端修改

在`game_manager.js`中添加了：
- `operationHistory`数组：存储每步操作
- `startTime`：游戏开始时间
- `uploadGameRecord()`：游戏结束时上传记录

## 7. 数据库设计

### game_records表
| 字段名       | 类型     | 描述                     |
|-------------|----------|--------------------------|
| id          | int      | 主键                     |
| session_id  | string   | 会话ID                   |
| player_name | string   | 玩家名                   |
| score       | int      | 得分                     |
| game_time   | int64    | 游戏时间（毫秒）         |
| grid_size   | int      | 棋盘大小                 |
| won         | bool     | 是否胜利                 |
| over        | bool     | 是否结束                 |
| created_at  | time     | 创建时间                 |

### operations表
| 字段名              | 类型     | 描述                     |
|--------------------|----------|--------------------------|
| id                 | int      | 主键                     |
| game_record_id     | int      | 外键（game_records.id）  |
| direction          | int      | 方向                     |
| timestamp          | int64    | 时间戳                   |
| score              | int      | 当前得分                 |
| score_change       | int      | 得分变化                 |
| game_time_elapsed  | int64    | 游戏耗时（毫秒）         |

## 使用说明

1. 启动所有服务
2. 打开浏览器访问http://localhost
3. 开始游戏，系统会自动记录操作
4. 游戏结束后会自动上传记录到后端
5. 可以通过API查询排行榜和玩家记录