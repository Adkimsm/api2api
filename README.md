# api2api

Cloudflare Workers 上的私人 OpenAI-compatible 聚合网关。

你可以添加多个 OpenAI 兼容的上游 API，手动同步并缓存它们的模型列表，在管理页面选择要暴露的模型，然后用一个统一的 Worker 地址和一个统一 API Key 在任意 OpenAI 兼容客户端中访问这些模型。

## 功能

- Cloudflare Workers + Hono
- Cloudflare D1 缓存 provider 和模型列表
- `/admin` 管理后台：React + Vite + Tailwind v4 + shadcn/ui，跟随系统亮暗主题
- 通过 Cloudflare Workers Assets 直接提供静态资源
- 添加、编辑、删除、启用、禁用 provider
- **工具注入**：为每个 provider 配置要注入的 OpenAI tools，转发时自动合并到请求中
- 从每个 provider 的 `GET /v1/models` 同步模型并存储到 D1
- 管理页面选择要暴露的模型
- 可编辑公开模型 ID，例如 `openrouter/openai/gpt-4o-mini`
- 一键导出客户端配置文件（当前支持 opencode）
- `GET /v1/models` 只返回已选择模型，不实时请求上游
- `POST /v1/chat/completions` 按模型映射转发到上游 `/v1/chat/completions`
- `POST /v1/responses` 按模型映射转发到上游 `/v1/responses`
- 自动统计 Token 使用量，支持按模型、按时间段（日/周/月）统计
- 响应流式透传，不主动缓冲 SSE
- 所有管理和 OpenAI 兼容路径都需要鉴权

## 路由

公开但不泄露配置：

```txt
GET /health
OPTIONS /*
```

管理后台（由 Workers Assets 提供，`/admin` 与 `/admin/` 都可访问）：

```txt
GET /admin
GET /admin/assets/*
```

管理 API，全部需要 `ADMIN_TOKEN`：

```txt
GET    /api/providers
POST   /api/providers
PATCH  /api/providers/:id
DELETE /api/providers/:id
POST   /api/providers/:id/sync

GET    /api/models
POST   /api/models/sync-all
PATCH  /api/models/:id

GET    /api/stats/tokens
GET    /api/stats/tokens/trend
```

OpenAI-compatible API，全部需要 `SERVICE_API_KEY`：

```txt
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
```

## 项目结构

```txt
api2api/
├── src/                  Worker 后端（Hono + D1）
│   ├── index.ts          路由入口
│   ├── auth.ts           ADMIN_TOKEN / SERVICE_API_KEY 鉴权中间件
│   ├── providers.ts      /api/providers
│   ├── models.ts         /api/models + 同步逻辑
│   ├── openai.ts         /v1/* OpenAI-compatible 转发 + 工具注入
│   ├── stats.ts          /api/stats Token 用量统计
│   ├── db.ts             D1 查询
│   ├── crypto.ts         provider API Key 加解密
│   ├── validation.ts     工具定义 JSON 验证
│   ├── http.ts           JSON / CORS / 错误响应
│   └── types.ts          Env / 业务类型
├── frontend/             管理后台（Vite + React + Tailwind v4 + shadcn/ui）
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── components.json   shadcn/ui 配置
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx       哈希路由 + 鉴权状态机
│   │   ├── api.ts        fetch 封装 + 401 处理
│   │   ├── auth.ts       localStorage token 管理
│   │   ├── router.ts     useHashRoute hook
│   │   ├── index.css     Tailwind + shadcn 主题变量
│   │   ├── components/   Layout / Login / ProviderForm / ProviderCard / ModelRow
│   │   ├── components/ui 直接拉自 shadcn/ui + Textarea
│   │   ├── pages/        Overview / Providers / Models / Stats
│   │   └── hooks/        useAdminData (Context)
│   └── dist/             vite build 产物（部署时由 Workers Assets 上传）
├── migrations/           D1 SQL 迁移
├── wrangler.example.jsonc
└── wrangler.jsonc        本地真实配置（被 .gitignore）
```

## 工作方式

1. 进入 `/admin`。
2. 输入 `ADMIN_TOKEN`，保存到浏览器 `localStorage`。
3. 在「Provider 管理」添加 provider。
4. 点击同步模型。
5. 在「模型管理」里勾选要暴露的模型，必要时改 Public Model ID。
6. 在「概览」复制 Endpoint / SERVICE_API_KEY，或一键导出 opencode 配置文件。
7. OpenAI 兼容客户端使用 Worker 的 `/v1` 地址和 `SERVICE_API_KEY`。
8. 在「用量统计」查看 Token 使用量、按模型分布和趋势图表。

请求转发时只改写 `model` 字段，其他请求体字段尽量保持原样。

例如客户端请求：

```json
{
  "model": "openrouter/openai/gpt-4o-mini",
  "messages": [
    { "role": "user", "content": "hello" }
  ],
  "stream": true
}
```

如果该公开模型映射到 provider `openrouter` 的真实模型 `openai/gpt-4o-mini`，Worker 会转发：

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    { "role": "user", "content": "hello" }
  ],
  "stream": true
}
```

到：

```txt
https://openrouter.ai/api/v1/chat/completions
```

`/v1/responses` 同理，严格转发到上游 `/v1/responses`，不会转换成 `/v1/chat/completions`。

## 本地准备

需要 Node 20+ 与 npm。安装依赖（根目录 + 前端各装一次）：

```bash
npm install
npm --prefix frontend install
```

登录 Cloudflare：

```bash
npx wrangler login
```

## 创建 D1 数据库

创建数据库：

```bash
npx wrangler d1 create api2api-db
```

命令会输出类似：

```txt
[[d1_databases]]
binding = "DB"
database_name = "api2api-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

公开仓库不要提交真实 `database_id`。先复制示例配置到本地真实配置：

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

`wrangler.jsonc` 已被 `.gitignore` 忽略，不会提交到公开仓库。

然后把 `database_id` 填入本地 `wrangler.jsonc`：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "api2api-db",
    "database_id": "你的 database_id"
  }
]
```

## 设置 Secrets

设置管理后台 Token：

```bash
npx wrangler secret put ADMIN_TOKEN
```

设置 OpenAI 兼容客户端使用的统一 API Key：

```bash
npx wrangler secret put SERVICE_API_KEY
```

设置 provider API Key 加密密钥：

```bash
npx wrangler secret put API_KEY_ENCRYPTION_SECRET
```

建议用 32 字节以上随机字符串，例如：

```bash
openssl rand -base64 32
```

不要把 `ADMIN_TOKEN` 和 `SERVICE_API_KEY` 设置成一样。

## 执行数据库迁移

远程 D1：

```bash
npm run db:migrate
```

本地开发 D1：

```bash
npm run db:migrate:local
```

## 本地开发

本地开发时，secrets 可以用 `.dev.vars`，不要提交这个文件。

创建 `.dev.vars`：

```txt
ADMIN_TOKEN=your-admin-token
SERVICE_API_KEY=sk-api2api-local
API_KEY_ENCRYPTION_SECRET=your-32-byte-random-secret
CORS_ORIGIN=*
```

启动 worker + 前端 dev server（通过 `concurrently` 并发跑）：

```bash
npm run dev
```

- `wrangler dev` 监听 `http://localhost:8787`，承担 `/api/*`、`/v1/*`、`/health`
- `vite` 监听 `http://localhost:5173`，承担 `/admin/`，并把 `/api`、`/v1`、`/health` proxy 到 wrangler

开发时打开：

```txt
http://localhost:5173/admin/
```

通过 vite 访问能拿到 HMR，登录态会照常打 worker。如果只想跑后端：

```bash
npm run dev:worker
```

构建前端产物（输出到 `frontend/dist/admin/`）：

```bash
npm run build:frontend
```

类型检查（worker + 前端各跑一遍 `tsc --noEmit`）：

```bash
npm run typecheck
```

## 部署

`npm run deploy` 会先构建前端（`vite build` → `frontend/dist/admin/`），然后 `wrangler deploy` 把 Worker 与静态资源一起上传：

```bash
npm run deploy
```

`wrangler.jsonc` 里的 `assets` 块负责把 `frontend/dist` 挂到 Workers Assets：

```jsonc
"assets": {
  "directory": "./frontend/dist",
  "html_handling": "auto-trailing-slash",
  "not_found_handling": "none"
}
```

- 静态资源（`/admin`、`/admin/assets/*`）由 Cloudflare 直接服务，不经过 Worker
- `not_found_handling: "none"` 让未匹配的路径透传给 Worker，确保 `/api/*`、`/v1/*` 仍走 Hono 路由
- 我们用哈希路由（`#/overview`、`#/providers`、`#/models`），子页切换不会触发服务端导航，因此不需要 SPA 回退

部署完成后会得到 Worker 地址，例如：

```txt
https://api2api.your-subdomain.workers.dev
```

管理后台：

```txt
https://api2api.your-subdomain.workers.dev/admin/
```

OpenAI-compatible Base URL：

```txt
https://api2api.your-subdomain.workers.dev/v1
```

## 添加 Provider

在 `/admin` 中添加 provider。

字段说明：

- `Name`：provider 名称，例如 `openrouter`、`openai`、`deepseek`
- `Base URL`：必须包含 `/v1`
- `API Key`：上游 provider 的 API key
- `Enabled`：是否启用
- `启用工具注入`：是否在转发请求时注入额外的工具定义
- `工具定义`：OpenAI tools 数组的 JSON 格式，例如：

```json
[
  {
    "type": "function",
    "name": "get_weather",
    "description": "获取天气信息",
    "parameters": {
      "type": "object",
      "properties": {
        "location": { "type": "string" }
      },
      "required": ["location"]
    }
  },
  {
    "type": "web_search"
  }
]
```

支持所有 OpenAI 工具类型：`function`、`file_search`、`web_search`、`code_interpreter`、`computer`、`mcp` 等。

转发时使用 **Merge 策略**：客户端提供的工具和注入的工具会合并，如果是同名的 `function` 类型工具则保留客户端的定义。

常见示例：

```txt
OpenAI:     https://api.openai.com/v1
OpenRouter: https://openrouter.ai/api/v1
DeepSeek:   https://api.deepseek.com/v1
```

添加后点击 `同步模型`，Worker 会请求：

```txt
GET {Base URL}/models
Authorization: Bearer {Provider API Key}
```

同步结果会保存到 D1。

## 管理模型

同步完成后，在「模型管理」可以：

- 搜索 remote / public model id
- 按 provider 筛选
- 勾选是否暴露
- 修改 `Public Model ID`，回车或点 ✓ 保存
- 一键「全选可见」/「全取消可见」当前过滤结果

默认公开模型名格式：

```txt
providerName/remoteModelId
```

例如：

```txt
openrouter/openai/gpt-4o-mini
deepseek/deepseek-chat
```

## 客户端配置

在任意 OpenAI 兼容客户端中配置：

```txt
Base URL: https://api2api.your-subdomain.workers.dev/v1
API Key:  你的 SERVICE_API_KEY
```

模型列表来自：

```txt
GET /v1/models
```

只有你在管理页面勾选的模型会返回。

### 导出 opencode 配置文件

在「概览」页面选择目标平台并点导出，会下载一份 `opencode.json`，包含已选模型与当前 Endpoint / SERVICE_API_KEY：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "api2api": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "api2api",
      "options": {
        "baseURL": "https://api2api.your-subdomain.workers.dev/v1",
        "apiKey": "sk-api2api-your-key"
      },
      "models": {
        "openrouter/openai/gpt-4o-mini": { "name": "openrouter/openai/gpt-4o-mini" }
      }
    }
  }
}
```

放到 opencode 配置目录即可直接使用。

## curl 测试

查看模型：

```bash
curl https://api2api.your-subdomain.workers.dev/v1/models \
  -H "Authorization: Bearer sk-api2api-your-key"
```

Chat Completions：

```bash
curl https://api2api.your-subdomain.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer sk-api2api-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter/openai/gpt-4o-mini",
    "messages": [{ "role": "user", "content": "hello" }],
    "stream": true
  }'
```

Responses API：

```bash
curl https://api2api.your-subdomain.workers.dev/v1/responses \
  -H "Authorization: Bearer sk-api2api-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4.1-mini",
    "input": "hello"
  }'
```

## 鉴权

所有业务路径都需要鉴权。

管理 API：

```http
Authorization: Bearer ADMIN_TOKEN
```

OpenAI-compatible API：

```http
Authorization: Bearer SERVICE_API_KEY
```

`/v1/models` 也需要鉴权，防止别人枚举你的模型并滥用服务。

## CORS

默认 `CORS_ORIGIN=*`。

如果你想限制浏览器来源，可以在 `wrangler.jsonc` 或 Cloudflare Dashboard 中设置：

```txt
CORS_ORIGIN=https://your-domain.example
```

注意：CORS 只控制浏览器跨域，不替代 Bearer token 鉴权。

## 流式响应说明

本项目会解析上游响应以提取 Token 使用量统计：

- **非流式响应**：读取完整 JSON 响应，提取 `usage` 字段后返回给客户端
- **流式响应**：使用 TransformStream 拦截 SSE 数据，解析最后一条数据中的 `usage` 字段

Token 使用量会异步写入 D1 数据库，不阻塞响应返回。这样既能统计用量，又保持了接近透明代理的性能。

Cloudflare Workers 适合个人自用和常规流式聊天，但不承诺无限长连接。如果你的场景需要十几分钟以上的超长连接、高并发或商业级稳定性，建议后续把代理层迁移到 VPS、Fly.io、Railway 等长连接运行时。

## 安全注意

- 不要把 `.dev.vars` 提交到仓库。
- 不要把上游 API Key 写进代码。
- Provider API Key 会用 `API_KEY_ENCRYPTION_SECRET` 派生 AES-GCM 密钥后加密存入 D1。
- 管理 API 不会返回 provider API Key 明文。
- `ADMIN_TOKEN` 只保存在当前浏览器 `localStorage`，换浏览器需要重新输入。
- 如果怀疑泄露，立即轮换 `ADMIN_TOKEN`、`SERVICE_API_KEY` 和上游 provider API Key。

## 当前限制

- 第一版只支持 OpenAI-compatible `models`、`chat/completions`、`responses`。
- 不支持把 `/responses` 自动转换成 `/chat/completions`。
- 不支持把 `/chat/completions` 自动转换成 `/responses`。
- 不做审计日志、计费或限流。
- 上游如果不支持 `/v1/responses`，错误会原样返回给客户端。
