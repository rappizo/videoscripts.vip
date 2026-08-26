# ---- 构建阶段 ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- 运行阶段 ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# 运行时读取的资产与 schema
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prompts ./prompts
COPY --from=builder /app/cases ./cases

EXPOSE 3000

# 等待数据库就绪并同步 schema,然后启动(长请求由自托管 Node 处理,无 serverless 超时问题)
CMD ["sh", "-c", "until npx prisma db push; do echo 'waiting for database...'; sleep 3; done && node server.js"]
