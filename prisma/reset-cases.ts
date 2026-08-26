// 重置案例库:清空后按 cases/*.json 重新导入(用于更新内置语料)
import { prisma } from "../lib/db";
import { seedCasesIfEmpty } from "../lib/cases";

async function main() {
  await prisma.case.deleteMany({});
  await seedCasesIfEmpty();
  const count = await prisma.case.count();
  console.log(`Cases reset, ${count} rows seeded.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
