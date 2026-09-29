# MatchScope

MatchScope 是一套足球比赛赛前分析与推送系统。管理员负责录入比赛、维护分析模板和发布结果，普通用户通过 iPhone App 查看比赛、历史记录和个人设置。

## 项目结构

- `apps/mobile` 普通用户 iPhone 客户端，基于 Expo 和 React Native
- `apps/admin` 管理员网页后台，基于 React 和 Vite
- `apps/api` 后端接口与定时任务入口，基于 Fastify

## 本地启动

```bash
npm install
npm run api
npm run admin
npm run mobile
```

Windows 环境下可以在 iPhone 安装 Expo Go，然后扫描 Expo 开发服务器二维码进行内测。正式 TestFlight 构建需要 Apple 开发者账号和对应构建服务。

## 第一版边界

- 普通用户端只提供比赛、记录和设置
- 分析话术只在管理员后台展示和编辑
- OpenAI 和邮件密钥只能保存在后端环境变量中
- 当前示例数据用于页面开发，尚未连接数据库和 OpenAI API
