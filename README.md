# VideoScripts — 短视频脚本 AI 工作室

专为 TikTok 短视频脚本打造的五阶段 AI 流水线,解决通用大模型写脚本的五个痛点:

| 痛点 | 机制 |
| --- | --- |
| 文本能力下降 | 写作专用模型(Claude)+ 评审/改写闭环 + 修改数据自动记录供后期微调 |
| 重复套路 | 创意牌组随机注入(结构×人设×开场×情绪×跨域混搭)+ 反套路黑名单 + 相似度去重 |
| 素材被忽略 | 素材字段化录入,大纲阶段**锁死引用点**,规则校验 + 自动重写 |
| 没创造力 | 多候选 + 高发散采样 + 跨域混搭 + 迭代改写 |
| 钩子平庸 | 独立钩子工厂:12 类公式 × 多候选,五维 rubric 评分排序 |

## 快速开始(本地开发)

前置:一个可用的 PostgreSQL(任选其一):
- 本机安装 PostgreSQL;
- 或用云数据库连接串(如 Neon 免费版);
- 或装 Docker 后只起数据库:`docker compose up -d db`

```bash
npm install
cp .env.example .env          # 填入 apiyi 的 AI_API_KEY 与 DATABASE_URL
npx prisma db push            # 同步数据库 schema(需 PostgreSQL 已启动)
npm run db:seed               # 导入内置案例库
npm run dev                   # http://localhost:3000
```

打开「模型诊断」页面确认可用模型名,把 claude 模型名填入 `.env` 的 `MODEL_CREATIVE` / `MODEL_CRITIC`。

更新内置语料后执行 `npx tsx prisma/reset-cases.ts` 重建案例库。

## 部署(自托管 Docker)

一键部署到任意装有 Docker 的服务器(VPS、NAS、云主机):

```bash
# 1. 在服务器克隆代码并配置 .env(上线必须设置 APP_PASSWORD 与 AUTH_SECRET)
# 2. 构建并启动(应用 + PostgreSQL,数据持久化在 pgdata 卷)
docker compose up -d --build
```

说明:
- 访问 `http://服务器IP:3000`,输入 APP_PASSWORD 登录
- 长请求(生成脚本 1-3 分钟)由自托管 Node 处理,无 serverless 超时限制
- 数据库、AI Key 等敏感信息全部通过 `.env` 注入容器,不会打进镜像
- `APP_PASSWORD` / `AUTH_SECRET` 未设置时跳过登录保护(仅限本地开发)

## 工作流(产品宣传视频脚本)

0. **产品简报**:选品类(护肤品/美妆/数码…)+ 填产品名 → AI 生成 5 个完整项目方案(含钩子预览、受众、卖点素材),可换一批,选一个开工
1. **角度**:生成 5 个候选,每个带一套随机创意牌,选 1
2. **钩子工厂**:生成 12 条钩子(12 类公式随机抽取),五维评分取 top 5,选 1
3. **大纲**:分节大纲强制标注素材引用点,可编辑,锁定
4. **脚本**:3 个候选(不同牌组),六维评审 + 定向改写,可手动编辑/复制/重新评审

## 配置项(.env)

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `AI_API_KEY` | apiyi 的 API Key |
| `AI_BASE_URL` | 默认 `https://api.apiyi.com/v1`(OpenAI 兼容) |
| `MODEL_CREATIVE` | 发散/正文模型,默认 `claude-opus-5` |
| `MODEL_CRITIC` | 评审模型,默认 `claude-sonnet-5` |
| `MODEL_FALLBACKS` | 主模型遇通道/限流错误时的降级链(逗号分隔) |
| `APP_PASSWORD` | 访问密码(上线必填,与 AUTH_SECRET 同时设置) |
| `AUTH_SECRET` | 登录签名的随机密钥(上线必填,建议长随机串) |
| `AI_CONCURRENCY` | 并行度,默认 4 |

## 成本

单脚本全流程约 15-30k tokens,约 $0.10-0.30(Claude 级)。
