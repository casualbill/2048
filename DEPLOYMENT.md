# 2048游戏部署说明

## 环境要求
- Docker
- Docker Compose

## 部署步骤

### 1. 克隆项目
```bash
git clone <repository-url>
cd 2048
```

### 2. 启动所有服务
```bash
docker-compose up -d
```

这将启动四个服务：
- frontend: 运行在 http://localhost
- backend: 运行在 http://localhost:8080
- postgres: 运行在 port 5432
- redis: 运行在 port 6379

### 3. 访问游戏
打开浏览器访问：
```
http://localhost
```

## 手动部署（可选）

### 后端部署

1. 安装Go依赖：
```bash
cd backend
GO111MODULE=on go mod download
```

2. 配置数据库：
```bash
# 创建PostgreSQL数据库
psql -c "CREATE DATABASE 2048game;" -U postgres
```

3. 启动后端服务：
```bash
go run main.go
```

### 前端部署

1. 安装依赖（如果需要）：
```bash
cd frontend
npm install
```

2. 构建前端：
```bash
npm run build
```

3. 使用Nginx或其他Web服务器提供静态文件

## API测试

使用提供的测试脚本测试API：
```bash
cd tests
python3 test_api.py
```

## 停止服务

```bash
docker-compose down
```

## 查看日志

```bash
docker-compose logs -f
```

## 数据库备份

```bash
docker-compose exec postgres pg_dump -U postgres 2048game > backup.sql
```

## 数据库恢复

```bash
docker-compose exec -T postgres psql -U postgres 2048game < backup.sql
```

## 常见问题

### 1. 端口冲突
如果端口80、8080、5432或6379已被占用，可以在docker-compose.yml中修改端口映射。

### 2. 数据库连接失败
确保PostgreSQL和Redis服务已正确启动。可以通过以下命令检查：
```bash
docker-compose ps
```

### 3. 前端无法连接到后端
确保API_BASE_URL在leaderboard.js和game_manager.js中配置正确。