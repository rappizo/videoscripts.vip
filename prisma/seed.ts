// 种子脚本:内置案例库写入数据库(幂等)
import { seedCasesIfEmpty } from "../lib/cases";

seedCasesIfEmpty()
  .then(async () => {
    const { prisma } = await import("../lib/db");
    const count = await prisma.case.count();
    console.log(`Cases ready (${count} rows).`);
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
