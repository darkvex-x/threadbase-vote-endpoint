import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

const databaseUrl = new URL(connectionString);

const connectionLimit = Number(
  databaseUrl.searchParams.get("connection_limit") ?? 5,
);

const poolTimeout = Number(databaseUrl.searchParams.get("pool_timeout") ?? 10);

if (
  !Number.isInteger(connectionLimit) ||
  connectionLimit < 1 ||
  !Number.isFinite(poolTimeout) ||
  poolTimeout <= 0
) {
  throw new Error("Invalid connection_limit or pool_timeout in DATABASE_URL");
}

const adapter = new PrismaPg({
  connectionString,
  max: connectionLimit,
  connectionTimeoutMillis: poolTimeout * 1000,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Connection limit: ${connectionLimit}`);
  console.log(`Pool timeout: ${poolTimeout}s`);

  // Warm up the database only for the fixed configuration.
  if (connectionLimit > 1) {
    await prisma.$queryRaw`SELECT 1`;
  }

  const start = performance.now();

  const results = await Promise.allSettled(
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

  const successful = results.filter((result) => result.status === "fulfilled");

  const failed = results.filter((result) => result.status === "rejected");

  console.table(
    results.map((result, index) => {
      if (result.status === "fulfilled") {
        return {
          request: index + 1,
          status: "SUCCESS",
          timeMs: result.value.timeMs,
        };
      }

      return {
        request: index + 1,
        status: "FAILED",
        error: String(result.reason).split("\n")[0],
      };
    }),
  );

  console.log(`Successful requests: ${successful.length}/8`);
  console.log(`Failed requests: ${failed.length}/8`);
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
