# MatchScope 云服务器环境配置说明

> 文档日期：2026 年 9 月 28 日  
> 适用项目：MatchScope 足球比赛赛前分析与推送系统
>
> **敏感信息提示：本文包含数据库明文密码，仅限本地保存，禁止上传 Git、网盘或公开分享。**

## 当前结论

云服务器的 Node.js、Docker、编译工具链和 PostgreSQL 已安装并运行。

PostgreSQL 已在服务器端监听公网端口 `5432`，但从本地电脑测试仍然超时，说明腾讯云安全组尚未放行该端口。完成安全组规则后，即可使用本文的连接参数从本地开发环境访问数据库。

## 1 服务器概况

| 项目 | 当前配置 |
| --- | --- |
| 公网 IP | `150.109.194.84` |
| 操作系统 | Ubuntu 24.04 LTS |
| 架构 | x86_64 |
| SSH 用户 | `ubuntu` |
| SSH 端口 | `22` |
| 磁盘 | 约 50 GB，总可用约 42 GB（配置时） |
| 内存 | 约 1.6 GiB |
| Swap | 约 1.9 GiB |
| 服务器内网 IP | `10.7.0.2` |

SSH 登录：

```powershell
ssh ubuntu@150.109.194.84
```

当前可通过密码登录。密码不写入本文档，建议部署稳定后改用 SSH 密钥并更换现有密码。

## 2 已安装运行环境

| 组件 | 版本或状态 | 用途 |
| --- | --- | --- |
| Node.js | `24.21.0` | 运行 Fastify API、构建管理后台和执行项目脚本 |
| npm | `11.19.0` | 管理 monorepo 与应用依赖 |
| Git | `2.43.0` | 代码拉取、版本管理和部署更新 |
| Docker Engine | `27.5.1`，active | 运行 PostgreSQL 和后续应用容器 |
| Docker Compose | `2.32.4` | 管理项目容器编排 |
| GCC | `13.3.0` | 编译 Argon2 等可能含原生模块的依赖 |
| PostgreSQL | `17.11`，healthy | 保存用户、比赛、分析模板、设置和日志 |

## 3 服务器目录结构

| 路径 | 权限 | 说明 |
| --- | --- | --- |
| `/opt/match-insight` | ubuntu 用户可管理 | 项目部署根目录 |
| `/opt/match-insight/infra` | ubuntu 用户可管理 | 基础设施配置目录 |
| `/opt/match-insight/infra/compose.yaml` | `644` | 当前 PostgreSQL Compose 配置 |
| `/opt/match-insight/infra/.env` | `600` | 数据库名称、用户和强密码；禁止提交到 Git |

## 4 PostgreSQL 配置

| 参数 | 值 |
| --- | --- |
| 容器名称 | `matchscope-postgres` |
| 镜像 | `postgres:17-alpine` |
| 数据库名称 | `match_insight` |
| 数据库用户 | `match_insight` |
| 数据库密码 | `806fb43c86355054f6051446bd3125af25c5361dff938652a9050ee9e40fa1a3` |
| 服务器地址 | `150.109.194.84` |
| 端口 | `5432` |
| 监听地址 | `0.0.0.0:5432` |
| 密码认证 | SCRAM-SHA-256 |
| 时区 | `Asia/Shanghai` |
| 重启策略 | `unless-stopped` |
| 数据卷 | `infra_matchscope_postgres_data` |
| 健康检查 | `pg_isready`，每 10 秒检查一次 |

### 4.1 读取数据库密码

数据库密码为：

```text
806fb43c86355054f6051446bd3125af25c5361dff938652a9050ee9e40fa1a3
```

该密码同时保存在服务器权限为 `600` 的环境文件中。如需从服务器重新读取，可在本地 PowerShell 执行：

```powershell
ssh ubuntu@150.109.194.84 "grep POSTGRES_PASSWORD /opt/match-insight/infra/.env"
```

### 4.2 本地数据库连接串

```text
postgresql://match_insight:806fb43c86355054f6051446bd3125af25c5361dff938652a9050ee9e40fa1a3@150.109.194.84:5432/match_insight
```

项目后端环境变量：

```dotenv
DATABASE_URL=postgresql://match_insight:806fb43c86355054f6051446bd3125af25c5361dff938652a9050ee9e40fa1a3@150.109.194.84:5432/match_insight
```

## 5 腾讯云安全组

### 当前状态

- PostgreSQL 已监听 `0.0.0.0:5432`。
- PostgreSQL 容器状态健康。
- 从本地电脑访问 `150.109.194.84:5432` 仍然超时。
- 腾讯云安全组尚未放行 TCP 端口 `5432`。

### 推荐入站规则

| 规则字段 | 推荐值 |
| --- | --- |
| 方向 | 入站 |
| 协议 | TCP |
| 端口 | `5432` |
| 来源 | `120.84.12.18/32`（配置时检测到的本地公网 IP） |
| 策略 | 允许 |

如果本地公网 IP 变化，需要同步修改安全组来源。可以临时使用 `0.0.0.0/0` 排查连接，但不建议长期向全网开放 PostgreSQL。

## 6 本地开发连接检查

完成腾讯云安全组配置后，在 Windows PowerShell 检查端口：

```powershell
Test-NetConnection 150.109.194.84 -Port 5432
```

结果中的 `TcpTestSucceeded` 应为 `True`。然后可使用 DBeaver、TablePlus、psql 或项目的 Drizzle ORM 连接。

## 7 常用运维命令

以下命令需要先 SSH 登录服务器。

### 查看容器状态

```bash
cd /opt/match-insight/infra
sudo docker compose ps
```

### 查看数据库日志

```bash
cd /opt/match-insight/infra
sudo docker compose logs --tail=100 postgres
```

### 启动数据库

```bash
cd /opt/match-insight/infra
sudo docker compose up -d postgres
```

### 停止数据库

```bash
cd /opt/match-insight/infra
sudo docker compose stop postgres
```

### 重启数据库

```bash
cd /opt/match-insight/infra
sudo docker compose restart postgres
```

### 进入 psql

```bash
sudo docker exec -it matchscope-postgres psql -U match_insight -d match_insight
```

### 检查监听端口

```bash
sudo ss -ltnp | grep 5432
```

## 8 应用部署参数规划

| 服务 | 规划端口或地址 | 当前状态 |
| --- | --- | --- |
| Fastify API | `8187` | 代码尚未部署 |
| React 管理后台 | `5174`（开发） | 代码尚未部署 |
| PostgreSQL | `5432` | 运行中，等待安全组放行 |
| Expo Metro | 固定为 `8183` | 在本地开发电脑运行 |

后端计划使用的主要环境变量如下。正式部署时，JWT 密钥必须单独随机生成，不应复制示例值：

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=8187
DATABASE_URL=postgresql://match_insight:806fb43c86355054f6051446bd3125af25c5361dff938652a9050ee9e40fa1a3@postgres:5432/match_insight
APP_TIMEZONE=Asia/Shanghai
JWT_ACCESS_SECRET=生成独立强随机值
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
CORS_ORIGINS=https://你的管理后台域名
```

## 9 当前完成情况与待办

| 事项 | 状态 | 说明 |
| --- | --- | --- |
| 服务器基础环境 | 已完成 | Node.js、npm、Git、Docker、Compose 和编译工具已验证 |
| PostgreSQL | 已完成 | 容器健康、数据持久化、自动重启和强密码认证已配置 |
| 服务器端公网监听 | 已完成 | PostgreSQL 已监听 `0.0.0.0:5432` |
| 腾讯云安全组 | 待完成 | 需在控制台放行 TCP 5432，推荐仅允许本地公网 IP |
| 项目代码上传 | 待完成 | 本地仓库目前没有远程 Git 地址，尚未上传服务器 |
| API 与管理后台部署 | 待完成 | 需在功能开发完成后构建并配置进程或容器 |
| HTTPS 与域名 | 待完成 | 正式使用前配置域名、反向代理和 TLS 证书 |

## 10 安全建议

- 完成本地连接测试后，将安全组来源限定为固定公网 IP，不要长期使用 `0.0.0.0/0`。
- 立即更换已在沟通中使用过的 SSH 密码，并改用 SSH 密钥登录。
- 数据库、JWT、OpenAI 和邮件密钥只能存放在服务器环境变量中，不得进入 Git 或移动端包。
- 服务器显示有较多系统更新待安装，应安排维护窗口执行更新，并在更新后检查 Docker 服务。
- 正式上线前配置数据库备份、恢复演练、日志轮转和磁盘空间监控。
- 当前 1.6 GiB 内存适合第一阶段轻量开发；构建与数据库同时高负载时需关注内存和 Swap。
