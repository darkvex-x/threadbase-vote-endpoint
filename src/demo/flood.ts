import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

const adapter = new PrismaPg({
  connectionString,
  max: 8,
  connectionTimeoutMillis: 5000,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Warm up the database connection before measuring.
  await prisma.$queryRaw`SELECT 1`;

  const start = performance.now();

  const results = await Promise.all(
    Array.from({ length: 8 }, async (_, index) => {
      const queryStart = performance.now();

      await prisma.$queryRaw`SELECT 1`;

      return {
        request: index + 1,
        timeMs: Math.round(performance.now() - queryStart),
      };
    }),
  );

  const totalMs = Math.round(performance.now() - start);

  console.table(results);
  console.log(`Successful requests: ${results.length}/8`);
  console.log(`Total time: ${totalMs} ms`);
}

main()
  .catch((error) => {
    console.error("Flood test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
