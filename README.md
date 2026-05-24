# api2api

Cloudflare Workers 上的私人 OpenAI-compatible 聚合网关。

你可以添加多个 OpenAI 兼容的上游 API，手动同步并缓存它们的模型列表，在管理页面选择要暴露的模型，然后用一个统一的 Worker 地址和一个统一 API Key 在任意 OpenAI 兼容客户端中访问这些模型。

## 功能

- Cloudflare Workers + Hono
- Cloudflare D1 缓存 provider 和模型列表
- `/admin` 简洁管理后台
- 添加、编辑、删除、启用、禁用 provider
- 从每个 provider 的 `GET /v1/models` 同步模型并存储到 D1
- 管理页面选择要暴露的模型
- 可编辑公开模型 ID，例如 `openrouter/openai/gpt-4o-mini`
- `GET /v1/models` 只返回已选择模型，不实时请求上游
- `POST /v1/chat/completions` 按模型映射转发到上游 `/v1/chat/completions`
- `POST /v1/responses` 按模型映射转发到上游 `/v1/responses`
- 响应流式透传，不主动缓冲 SSE
- 所有管理和 OpenAI 兼容路径都需要鉴权

## 路由

公开但不泄露配置：

```txt
GET /health
OPTIONS /*
```

管理后台：

```txt
GET /admin
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
```

OpenAI-compatible API，全部需要 `SERVICE_API_KEY`：

```txt
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
```

## 工作方式

1. 进入 `/admin`。
2. 输入 `ADMIN_TOKEN`，保存到浏览器 `localStorage`。
3. 添加 provider。
4. 点击同步模型。
5. 在模型管理里勾选要暴露的模型。
6. OpenAI 兼容客户端使用 Worker 的 `/v1` 地址和 `SERVICE_API_KEY`。

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

安装依赖：

```bash
npm install
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

把 `database_id` 填入 `wrangler.jsonc`：

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

启动：

```bash
npm run dev
```

打开：

```txt
http://localhost:8787/admin
```

## 部署

部署 Worker：

```bash
npm run deploy
```

部署完成后会得到 Worker 地址，例如：

```txt
https://api2api.your-subdomain.workers.dev
```

管理后台：

```txt
https://api2api.your-subdomain.workers.dev/admin
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

同步完成后，在模型管理区域可以：

- 搜索模型
- 按 provider 筛选
- 勾选是否暴露
- 修改 `Public Model ID`
- 批量选中当前可见模型
- 批量取消当前可见模型

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

本项目对上游响应使用：

```ts
return new Response(upstream.body, ...)
```

不会读取完整响应，不解析 SSE，不统计 token，不改写响应内容。这样最接近透明代理，也更适合常规 LLM streaming。

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
- 不做 token 统计、审计日志、计费或限流。
- 上游如果不支持 `/v1/responses`，错误会原样返回给客户端。
