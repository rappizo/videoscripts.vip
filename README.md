# VideoScripts — 短视频脚本 AI 工作室

专为 TikTok 短视频脚本打造的五阶段 AI 流水线,解决通用大模型写脚本的五个痛点:

| 痛点 | 机制 |
| --- | --- |
| 文本能力下降 | 写作专用模型(Claude)+ 评审/改写闭环 + 修改数据自动记录供后期微调 |
| 重复套路 | 创意牌组随机注入(结构×人设×开场×情绪×跨域混搭)+ 反套路黑名单 + 相似度去重 |
| 素材被忽略 | 素材字段化录入,大纲阶段**锁死引用点**,规则校验 + 自动重写 |
| 没创造力 | 多候选 + 高发散采样 + 跨域混搭 + 迭代改写 |
| 钩子平庸 | 独立钩子工厂:12 类公式 × 多候选,五维 rubric 评分排序 |

## 快速开始

```bash
npm install
cp .env.example .env        # 填入 apiyi 的 AI_API_KEY
npx prisma db push          # 创建 SQLite 数据库
npm run db:seed             # 导入内置案例库(50 条)
npm run dev                 # http://localhost:3000
```

打开「模型诊断」页面确认可用模型名,把 claude 模型名填入 `.env` 的 `MODEL_CREATIVE` / `MODEL_CRITIC`。

## 工作流

1. 新建项目:选题 + 素材字段化录入(事实/数据/金句/卖点/关键词)
2. **角度**:生成 5 个候选,每个带一套随机创意牌,选 1
3. **钩子工厂**:生成 12 条钩子(12 类公式随机抽取),五维评分取 top 5,选 1
4. **大纲**:分节大纲强制标注素材引用点,可编辑,锁定
5. **脚本**:3 个候选(不同牌组),六维评审 + 定向改写,可手动编辑/复制/重新评审

## 配置项(.env)

| 变量 | 说明 |
| --- | --- |
| `AI_API_KEY` | apiyi 的 API Key |
| `AI_BASE_URL` | 默认 `https://api.apiyi.com/v1`(OpenAI 兼容) |
| `MODEL_CREATIVE` | 发散/正文模型,默认 `claude-opus-4.6` |
| `MODEL_CRITIC` | 评审模型,默认同 creative |
| `AI_CONCURRENCY` | 并行度,默认 4 |

## 成本

单脚本全流程约 15-30k tokens,约 $0.10-0.30(Claude 级)。
