# MatchScope

MatchScope 是一套足球比赛赛前分析与推送系统。管理员负责录入比赛、维护分析模板和发布结果，普通用户通过 iPhone App 查看比赛、历史记录和个人设置。

## 项目结构

- `apps/mobile` 普通用户 iPhone 客户端，基于 Expo 和 React Native
- `apps/admin` 管理员网页后台，基于 React 和 Vite
- `apps/api` 后端接口与定时任务入口，基于 Fastify

## 换电脑与首次启动

准备 Git、Node.js 24.x（包含 npm）。使用本地数据库时还需要安装并启动 Docker Desktop；已有可访问的 PostgreSQL 17 及以上数据库时可以跳过 Docker。

在 PowerShell 中执行：

```powershell
git clone https://github.com/shengdehuang1998/MatchScope.git
cd MatchScope
npm ci
Copy-Item .env.example .env
```

如果已经克隆项目，在项目根目录执行 `git pull` 和 `npm ci`；已有 `.env` 时保留该文件，不要重复复制覆盖。

编辑项目根目录的 `.env`：

- `DATABASE_URL`：本地 Docker 数据库可使用示例地址；连接现有云数据库时填写实际连接字符串及服务商要求的 SSL 参数，并确认家里电脑可以访问数据库。
- `JWT_ACCESS_SECRET`：替换为至少 32 位的随机密钥，可以执行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` 生成。
- `INIT_USER_EMAIL`、`INIT_USER_PASSWORD`、`INIT_USER_DISPLAY_NAME`：用于空数据库的初始账号，密码至少 12 位。
- `EXPO_PUBLIC_API_URL`：电脑浏览器调试使用 `http://localhost:8187/api/v1`；iPhone 真机调试改为家里电脑的局域网 IP，例如 `http://192.168.1.100:8187/api/v1`。可用 `ipconfig` 查看 IPv4 地址。手机和电脑需要处于同一局域网，防火墙允许 Node.js 的局域网访问；修改后重启手机开发服务。

`.env` 包含数据库密码和密钥，已被 Git 忽略。换电脑需自行配置，Git 只同步 `.env.example`。数据库数据也不会随代码同步；连接同一个云数据库可访问已有数据，使用新的本地数据库需要初始化。

### 数据库初始化

使用本地 Docker 数据库时执行（使用云数据库则跳过）：

```powershell
docker compose up -d --wait postgres
```

默认数据库端口为 5432；若端口被占用，同时修改 `.env` 中的 `POSTGRES_PORT` 和 `DATABASE_URL` 端口。

对于新的空数据库，执行：

```powershell
npm run db:migrate
npm run db:seed
```

初始化后可使用 `.env` 中设置的账号登录。种子命令不会重置已有账号的密码。已有数据库若通过本项目迁移命令建立，可执行 `npm run db:migrate` 应用新增迁移；若曾手工执行 SQL、存在旧表但缺少迁移记录，请先按 [数据库说明](database/README.md) 检查现有结构，不要删除已有数据。

### 启动服务

在项目根目录分别打开三个终端：

```bash
npm run api
npm run admin
npm run mobile
```

后端地址为 `http://localhost:8187`，数据库就绪检查为 `http://localhost:8187/health/ready`；管理后台为 `http://localhost:5174`；Expo 开发服务器端口为 8183。

Windows 环境下可以在 iPhone 安装 Expo Go，然后扫描 Expo 开发服务器二维码进行内测。正式 TestFlight 构建需要 Apple 开发者账号和对应构建服务。

## 第一版边界

- 普通用户端只提供比赛、记录和设置
- 分析模板内容仅供管理员管理，手机端管理员操作属于后续目标
- OpenAI 和邮件密钥只能保存在后端环境变量中
- 当前后端已接入 PostgreSQL，包含认证、比赛及分析模板接口；完整角色隔离和业务展示仍待实现与验收
- OpenAI 预测、自动推送和正式邮件属于后续规划

当前实现与规划详见 [技术架构与编码规范](docs/architecture-and-coding-standards.md)。提交代码前可以执行 `npm run check` 和 `npm run build`。
