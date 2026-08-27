import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 使用自身 server,不需要 standalone(且 Turbopack+standalone 在 Vercel 上有
  // .next/next-server.js.nft.json 缺失的已知构建 bug);Docker 部署(本地/服务器构建)才需要
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
