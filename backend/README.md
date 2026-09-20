# Offer · 本机后端（FastAPI）

只在你自己的电脑上运行（监听 127.0.0.1），数据存在本机 SQLite。有了后端：

- **一份数据，所有浏览器共用**：Safari、Chrome、多个窗口打开的是同一份档案；一个窗口改了，其他窗口实时刷新（SSE）。
- **页面由后端提供**：打开 `http://127.0.0.1:8765/`，Chrome 插件不再需要「允许访问文件网址」。
- **可扩展**：每类数据都有表和 REST 接口；大模型调用集中在后端（Key 存本机数据库，不经过浏览器）。
- 不装后端也能用：直接双击 `index.html` 仍是离线模式（数据只在当前浏览器）。

## 启动

```bash
sh backend/run.sh            # 第一次会自动建虚拟环境、装依赖，然后打开 http://127.0.0.1:8765/
```

接口文档（可直接试调用）：http://127.0.0.1:8765/docs

配置用环境变量（或 `backend/.env`）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `QZ_DATA_DIR` | `backend/data` | SQLite 所在目录 |
| `QZ_PORT` | `8765` | 端口（run.sh 使用） |
| `QZ_PERSONAL_HTML` | 无 | 可选：另一个页面挂在 `/me` |
| `QZ_HOME_HTML` | 无 | 可选：打开 `/` 时返回的页面（默认是仓库根目录的 index.html） |
| `QZ_LLM_TIMEOUT` | `120` | 调用大模型超时（秒） |

## 结构

```
backend/
  app/
    main.py            应用入口：安全中间件、路由、页面
    config.py          配置（pydantic-settings）
    db.py              SQLite 连接（WAL），建表
    models.py          数据表：workspaces / documents / applications / jobs / sources / resume_versions / secrets
    schemas.py         请求与响应模型
    deps.py            公共依赖（数据库会话、档案名校验）
    routers/
      state.py         整份状态读写（带版本号）、导出
      resources.py     投递 / 岗位 / 公司来源 / 历史简历的增删改查，岗位批量导入
      misc.py          健康检查、实时事件、来源库、AI
    services/
      state_sync.py    前端状态 ⇄ 数据表 的拆分与拼装
      events.py        实时事件广播
      llm.py           大模型客户端（Claude + 所有兼容 OpenAI 的服务）
  tests/               pytest
```

### 数据模型

前端把所有数据放在一个对象里。后端把它拆开存：常用来查询的字段（公司、岗位、阶段、状态、匹配度、发现时间……）是带索引的列，完整对象放在 `data`（JSON）列。前端对象多了字段不用改表，后端功能又可以直接按列查询。每张表都有 `ws`（档案名），不同档案互不影响。

### 并发与同步

每个档案有 `version`。前端保存时带上它所基于的版本；别的窗口已经改过就返回 409，前端载入最新数据。任何写入（整份保存或分资源接口）都会通过 `/api/events` 推送给所有打开的页面。

### 安全

- 只接受 Host 为 `127.0.0.1` / `localhost` 的请求（防 DNS rebinding）。
- 跨域只放行本机页面和 Chrome 插件；不放行 `null` 来源（其他网站无法借沙箱 iframe 读写你的数据）。
- API Key 存在本机数据库的 `secrets` 表，接口只返回脱敏提示，不进入导出和同步。

## 接口一览

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET / PUT | `/api/state?ws=` | 整份状态读取 / 保存（`base_version` 冲突返回 409） |
| GET | `/api/state/export?ws=` | 导出备份 |
| GET | `/api/events?ws=` | 实时事件（SSE） |
| GET/POST/PATCH/DELETE | `/api/applications` | 投递（筛选：stage、phase、company、q） |
| GET/POST/PATCH/DELETE | `/api/jobs` | 发现的岗位（筛选：status、company、city、q） |
| POST | `/api/jobs/import` | 批量导入插件抓取的岗位（按 URL、公司+岗位去重） |
| GET/POST/PATCH/DELETE | `/api/sources` | 监控的公司来源 |
| GET/POST/PATCH/DELETE | `/api/resumes` | 历史简历 |
| GET | `/api/sites` | 内置来源库 |
| GET / PUT | `/api/ai/providers` | 大模型服务商与 Key（脱敏） |
| POST | `/api/ai/chat` | 调用大模型，支持工具调用 |

## 加一个新功能

1. **新数据**：在 `models.py` 建表（常用字段做列 + `data` JSON）。如果它来自前端状态，在 `services/state_sync.py` 的 `LIST_TABLES` 里登记。
2. **新接口**：简单增删改查用 `resources.make_router(...)` 一行；复杂逻辑在 `services/` 写函数，在 `routers/` 新建文件并在 `main.py` 注册。写入后调用 `bump()` + `broadcaster.publish()`，打开的页面会自动刷新。
3. **测试**：在 `tests/` 加用例，`.venv/bin/python -m pytest -q`。

## 开发

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8765
.venv/bin/python -m pytest -q
```
