# MatchScope 第一阶段开发清单与本地环境

## 1 第一阶段目标

第一阶段的目标是完成可在本地稳定运行的产品基础版本。用户能够登录 iPhone App，维护分析话术，新增、编辑、查看和取消比赛，所有数据通过真实后端写入 PostgreSQL，不再使用前端硬编码数据。

第一阶段不接入 OpenAI、自动定时分析和正式邮件发送。这些功能建立在第一阶段的数据模型、接口、身份认证和状态规则之上，放到第二阶段实现。

第一阶段完成后的最小闭环如下：

```text
用户登录
  ↓
维护默认分析话术
  ↓
新增比赛并选择话术版本
  ↓
后端校验并保存到 PostgreSQL
  ↓
App 查看比赛列表和详情
  ↓
编辑 开赛时间 或取消比赛
```

## 2 已确定的技术框架

| 层级 | 技术 | 第一阶段用途 |
| --- | --- | --- |
| 手机端 | Expo React Native TypeScript | iPhone App 页面与交互 |
| 手机端路由 | Expo Router | 页面导航和路由参数 |
| 服务端 | Node.js 24 LTS TypeScript Fastify | REST API 和业务逻辑 |
| 数据库 | PostgreSQL | 保存用户 比赛 话术 设置和日志 |
| ORM | Drizzle ORM | 数据表定义 查询和迁移 |
| 数据校验 | TypeBox JSON Schema | API 请求 响应和共享类型 |
| Web 后台 | React Vite TypeScript | 暂时保留 第一阶段仅作为可选调试界面 |
| 测试 | Vitest Fastify inject | 业务规则和 API 测试 |
| 本地基础设施 | Docker Desktop | 运行 PostgreSQL |

第一阶段采用模块化单体，不拆微服务。API 与未来的任务 Worker 共享数据库模型、业务规则和数据协议。

## 3 第一阶段功能清单

### 3.1 工程基础

- [ ] 将 Node.js 版本固定为 24 LTS。
- [ ] 保留 npm workspaces 管理 monorepo。
- [ ] 增加统一的 ESLint 和 Prettier 配置。
- [ ] 增加开发环境变量模板 `.env.example`。
- [ ] 增加本地 PostgreSQL 的 `docker-compose.yml`。
- [ ] 增加统一的开发、构建、检查和测试命令。
- [ ] 增加 `packages/contracts` 保存共享数据结构。
- [ ] 增加 `packages/database` 保存 Drizzle 表结构和迁移。
- [ ] 增加 `packages/domain` 保存跨 API 和 Worker 的业务逻辑。
- [ ] 保证整个仓库执行类型检查时没有错误。

### 3.2 数据库

- [ ] 建立 `users` 用户表。
- [ ] 建立 `sessions` 登录会话表。
- [ ] 建立 `matches` 比赛表。
- [ ] 建立 `prompt_templates` 话术模板表。
- [ ] 建立 `prompt_versions` 话术版本表。
- [ ] 建立 `user_settings` 用户设置表。
- [ ] 建立 `audit_logs` 操作日志表。
- [ ] 所有时间字段使用带时区时间类型。
- [ ] 建立首个数据库迁移。
- [ ] 提供创建单用户账户和默认话术的初始化命令。
- [ ] 不使用应用启动时自动修改表结构的方式管理生产数据库。

### 3.3 单用户登录

- [ ] 不开放公开注册。
- [ ] 提供邮箱和密码登录接口。
- [ ] 使用 Argon2id 保存密码哈希。
- [ ] 实现短期访问令牌。
- [ ] 实现可轮换的刷新令牌。
- [ ] 数据库只保存刷新令牌哈希。
- [ ] iPhone 使用 SecureStore 保存令牌。
- [ ] 实现退出登录和当前设备会话失效。
- [ ] 登录失败返回统一错误，不泄露账户是否存在。
- [ ] 登录接口增加基础速率限制。

### 3.4 比赛管理 API

- [ ] 新增比赛。
- [ ] 查询比赛列表。
- [ ] 查询比赛详情。
- [ ] 编辑未开始的比赛。
- [ ] 取消比赛。
- [ ] 删除草稿比赛；已产生业务记录的比赛优先使用软删除或取消状态。
- [ ] 支持按照状态和日期范围筛选。
- [ ] 校验联赛、主队、客队和开赛时间必填。
- [ ] 主队和客队不能完全相同。
- [ ] 开赛时间必须晚于当前时间。
- [ ] 保存用户输入的时区和标准化 UTC 时间。
- [ ] 保存补充资料原文。
- [ ] 保存比赛所绑定的话术版本。
- [ ] 修改开赛时间时增加 `schedule_version`，为第二阶段重排任务做准备。

第一阶段比赛状态只需要：

```text
draft
scheduled
cancelled
finished
```

不要在比赛表中提前混入 `AI 分析中` 或 `邮件失败` 等状态。分析状态和邮件状态将在第二阶段使用独立数据表管理。

### 3.5 话术管理

- [ ] 创建一个默认话术模板。
- [ ] 查询话术模板和当前版本。
- [ ] 编辑话术内容。
- [ ] 每次保存生成新的不可变版本。
- [ ] 设置默认话术模板。
- [ ] 查看历史版本的版本号和创建时间。
- [ ] 已被比赛引用的话术版本不得覆盖或删除。
- [ ] 新增比赛时默认选择当前启用的话术版本。

第一阶段不实现 AI 预览。话术页面只完成编辑、版本保存和选择。

### 3.6 用户设置

- [ ] 查看和修改接收邮箱。
- [ ] 设置默认时区，默认值为 `Asia/Shanghai`。
- [ ] 设置默认提前分析分钟数，默认值为 60。
- [ ] 保存邮件通知开关。
- [ ] 暂时隐藏或标记 App 推送为未开放。
- [ ] 对外部服务连接状态显示为未配置，不在客户端保存密钥。

### 3.7 iPhone App

- [ ] 将当前单文件界面迁移到 Expo Router 页面结构。
- [ ] 完成登录页。
- [ ] 底部导航调整为首页、话术、记录和设置。
- [ ] 首页显示下一场比赛和近期比赛。
- [ ] 完成新增比赛页面。
- [ ] 完成编辑比赛页面。
- [ ] 完成比赛详情页面。
- [ ] 完成取消和删除确认交互。
- [ ] 完成话术列表和话术编辑页面。
- [ ] 完成设置页面。
- [ ] 记录页面第一阶段显示空状态或待分析比赛，不伪造分析结果。
- [ ] 使用 TanStack Query连接真实 API。
- [ ] 实现加载、空数据、请求失败和无权限状态。
- [ ] 移除当前 App 中的硬编码比赛和邮箱数据。
- [ ] App 重启后能够恢复有效登录状态。

### 3.8 后端 API 规范

- [ ] API 使用 `/api/v1` 前缀。
- [ ] 所有业务接口要求身份认证。
- [ ] 请求和响应使用统一 Schema。
- [ ] 错误响应包含稳定错误码和用户可读信息。
- [ ] 为每个请求生成 `requestId`。
- [ ] 日志不记录密码、令牌和密钥。
- [ ] 提供 `/health/live` 存活检查。
- [ ] 提供 `/health/ready` 数据库就绪检查。
- [ ] 生成 OpenAPI 文档。
- [ ] 对列表接口设置分页上限。

建议的第一阶段接口：

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/matches
POST   /api/v1/matches
GET    /api/v1/matches/:id
PATCH  /api/v1/matches/:id
POST   /api/v1/matches/:id/cancel
DELETE /api/v1/matches/:id

GET    /api/v1/prompts
POST   /api/v1/prompts
GET    /api/v1/prompts/:id
POST   /api/v1/prompts/:id/versions
POST   /api/v1/prompts/:id/set-default

GET    /api/v1/settings
PATCH  /api/v1/settings
```

### 3.9 管理后台

管理后台不是第一阶段核心验收条件。现有代码保留，但不应阻塞手机端和后端闭环。

- [ ] 将硬编码数据替换为真实 API，完成后再启用。
- [ ] 第一阶段最多提供比赛和话术的只读调试能力。
- [ ] 不实现用户管理和复杂权限系统。
- [ ] 不在管理后台保存第三方密钥。

### 3.10 测试和质量

- [ ] 用户登录成功和失败测试。
- [ ] 未登录访问业务接口测试。
- [ ] 新增比赛字段校验测试。
- [ ] 相同主客队校验测试。
- [ ] 过去时间校验测试。
- [ ] 修改开赛时间后 `schedule_version` 增加测试。
- [ ] 话术保存后生成新版本测试。
- [ ] 旧话术版本保持不变测试。
- [ ] 比赛列表和筛选接口测试。
- [ ] 数据库迁移能够从空数据库执行成功。
- [ ] `npm run typecheck` 通过。
- [ ] `npm test` 通过。
- [ ] 主要 App 页面在真实 iPhone 上完成手工测试。

## 4 第一阶段不实现的功能

以下内容明确放到第二阶段或之后，避免第一阶段范围持续扩大：

- OpenAI API 调用。
- AI 结构化分析结果。
- pg-boss 正式任务执行器。
- 赛前自动定时分析。
- 立即分析和重新分析。
- Resend 邮件发送。
- 邮件失败自动重试。
- 第三方足球数据接口。
- App 推送通知。
- 短信通知。
- 多用户注册。
- 会员、付费和订阅。
- Android 正式适配。
- 管理员和普通用户的复杂角色权限。
- TestFlight 正式发布；第一阶段只要求真机开发测试可用。

## 5 第一阶段完成标准

同时满足以下条件，第一阶段才算完成：

- [ ] 可以用预置单用户账户在 iPhone App 登录。
- [ ] App 关闭并重新打开后仍能恢复登录。
- [ ] 可以创建默认话术并保存多个历史版本。
- [ ] 可以新增一场比赛并绑定明确的话术版本。
- [ ] 比赛数据真实写入 PostgreSQL。
- [ ] App 可以从 API 重新读取比赛，而不是依赖内存或硬编码。
- [ ] 可以编辑开赛时间并正确增加计划版本号。
- [ ] 可以取消比赛且列表和详情状态一致。
- [ ] 不合法的比赛信息会在前端和后端同时被阻止。
- [ ] API 重启后数据不会丢失。
- [ ] 仓库类型检查、测试和构建全部通过。
- [ ] 第三方服务密钥没有出现在 App 包和 Git 仓库中。

## 6 本地开发电脑要求

当前开发电脑是 Windows，第一阶段可以完整开发 React Native、后端和数据库，不需要立即购买 Mac。

建议配置：

- Windows 11 64 位。
- 16 GB 内存或以上。
- 20 GB 以上可用磁盘空间。
- 支持虚拟化，用于 Docker Desktop 和 WSL 2。
- 一台用于真机测试的 iPhone。
- 电脑和 iPhone 位于同一局域网，或使用 Expo 的其他连接方式。

Windows 不能本地运行 Xcode 和 iOS Simulator。当前阶段使用真实 iPhone 加 Expo Go 或 Expo Development Build 测试。需要深度调试原生 iOS 代码时才需要 Mac。

## 7 必须安装的软件

### 7.1 Git

用途：版本管理、分支和代码备份。

安装后检查：

```powershell
git --version
```

### 7.2 Node.js 24 LTS

用途：运行 Expo、Fastify、构建工具和测试。

建议安装 Node.js 24 LTS，不使用 Current 奇数或短周期版本。

安装后检查：

```powershell
node --version
npm --version
```

### 7.3 Docker Desktop

用途：在本地运行 PostgreSQL，避免手工安装和维护数据库服务。

安装要求：

- 启用 WSL 2 后端。
- 启用 Windows 虚拟化。
- Docker Desktop 启动后能够运行 Linux 容器。

检查：

```powershell
docker --version
docker compose version
```

### 7.4 Visual Studio Code

推荐作为主要编辑器，适合当前 TypeScript、React Native、Fastify 和 Docker 技术栈。

必须或推荐安装的扩展：

| 扩展 | 用途 | 必要性 |
| --- | --- | --- |
| ESLint | 实时代码规则检查 | 必须 |
| Prettier Code formatter | 统一代码格式 | 必须 |
| Error Lens | 在代码行内显示错误 | 推荐 |
| Docker | 查看容器和日志 | 推荐 |
| GitLens | 查看 Git 历史和改动来源 | 可选 |
| PostgreSQL 或 SQLTools | 查看本地数据库 | 可选 |
| REST Client | 在编辑器内调用 API | 可选 |

不要同时启用多个自动格式化工具，以免保存文件时互相修改格式。

### 7.5 iPhone 应用

开发初期安装：

- Expo Go，用于快速查看兼容的 React Native 页面。
- 后续安装 EAS Development Build，用于测试 SecureStore 等完整原生能力。

### 7.6 Expo 和 Apple 账户

- Expo 账户：第一阶段需要，用于后续 EAS Development Build。
- Apple ID：iPhone 日常使用所需。
- Apple Developer Program：第一阶段本地页面开发不强制，正式 TestFlight 构建前必须准备。

## 8 可选开发工具

- Bruno、Postman 或 Insomnia：手工测试 REST API，三选一即可。
- DBeaver 或 TablePlus：图形化查看 PostgreSQL，非必须。
- Windows Terminal：改善 PowerShell 和多终端使用体验。
- Figma：如果后续需要维护独立 UI 原型，可选。

不需要安装：

- Android Studio，除非决定测试 Android。
- Xcode，Windows 无法安装。
- 本地 Redis，第一阶段不使用。
- 本地 OpenAI 或大模型环境，第一阶段不调用模型。
- Java、Go 或 Python 后端运行环境。

## 9 本地服务和端口规划

| 服务 | 默认地址或端口 |
| --- | --- |
| Fastify API | `http://localhost:3000` |
| 管理后台 | `http://localhost:5173` |
| PostgreSQL | `localhost:5432` |
| Expo Metro | 由 Expo CLI 分配，通常从 `8081` 开始 |

如果真机访问本地 API，不能在 App 中使用 `localhost:3000`，因为 iPhone 的 `localhost` 指向手机本身。开发环境应使用电脑局域网 IP，例如：

```text
http://192.168.1.100:3000
```

生产环境必须使用 HTTPS 域名。

## 10 环境变量规划

仓库提交 `.env.example`，真实 `.env` 不提交 Git。

第一阶段需要：

```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://match_insight:match_insight@localhost:5432/match_insight
APP_TIMEZONE=Asia/Shanghai
JWT_ACCESS_SECRET=replace_with_long_random_value
JWT_REFRESH_SECRET=replace_with_another_long_random_value
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
CORS_ORIGINS=http://localhost:5173
```

移动端只允许配置非敏感公开变量，例如：

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api/v1
```

任何以 `EXPO_PUBLIC_` 开头的变量都会进入客户端构建，绝对不能放数据库密码、JWT 密钥、OpenAI 密钥或邮件密钥。

第二阶段再增加：

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
RESEND_API_KEY=
EMAIL_FROM=
```

## 11 本地启动流程

当前仓库已经可以运行类型检查和三个原型应用：

```powershell
npm install
npm run typecheck
npm run api
npm run admin
npm run mobile
```

完成第一阶段工程改造后，目标启动流程应统一为：

```powershell
# 安装依赖
npm install

# 启动 PostgreSQL
docker compose up -d postgres

# 执行数据库迁移
npm run db:migrate

# 创建初始单用户和默认话术
npm run db:seed

# 分别启动 API 和手机端
npm run api
npm run mobile
```

可选启动管理后台：

```powershell
npm run admin
```

## 12 推荐实施顺序

### 第一步 工程与数据库

- 建立共享包。
- 配置 PostgreSQL 和 Drizzle。
- 建立迁移和种子数据。
- 配置 ESLint、Prettier 和测试。

### 第二步 身份认证

- 创建单用户初始化命令。
- 完成登录、刷新和退出接口。
- 完成 App 登录页和 SecureStore。

### 第三步 话术版本

- 完成话术表结构和版本规则。
- 完成话术 API。
- 完成 App 话术页面。

### 第四步 比赛管理

- 完成比赛 API 和业务校验。
- 完成新增、列表、详情、编辑和取消页面。
- 完成时间、时区和计划版本处理。

### 第五步 设置和质量收尾

- 完成用户设置。
- 移除全部硬编码数据。
- 补齐错误状态和测试。
- 在真实 iPhone 上完成第一阶段验收。

## 13 开发原则

- PostgreSQL 是业务状态的唯一事实来源。
- 前端校验用于改善体验，后端必须再次校验。
- 所有时间在数据库中按 UTC 保存，界面按用户时区显示。
- 比赛、话术和设置只能通过 API 修改。
- 不把数据库访问代码写进路由处理函数。
- 不把业务规则写进 React 页面。
- 不覆盖已经被引用的话术版本。
- 不在代码和日志中出现密钥。
- 不为了未来可能的规模提前拆分微服务。
- 每完成一个模块，同时完成类型检查和核心测试。
