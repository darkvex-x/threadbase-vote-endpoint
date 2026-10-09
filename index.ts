import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

const adapter = new PrismaPg({ connectionString });
const app = express();
const prisma = new PrismaClient({ adapter });

app.use(express.json());

app.post(
  "/posts/:id/vote",
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. PARSE
    const rawPostId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const postId = Number.parseInt(rawPostId ?? "", 10);
    const userId = (req as any).user?.id ?? 1; // Default user ID

    // 2. VALIDATE
    if (!rawPostId || Number.isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    try {
      // 3. QUERY (Atomic pair inside transaction)
      const [, post] = await prisma.$transaction([
        prisma.vote.create({
          data: { userId, postId },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { score: { increment: 1 } },
        }),
      ]);

      // 4 + 5. SHAPE & RESPOND
      return res.status(201).json({ id: post.id, score: post.score });
    } catch (err: any) {
      // ERROR MAPPING
      if (err.code === "P2002") {
        return res.status(409).json({ error: "Already voted" });
      }
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Post not found" });
      }
      return next(err);
    }
  },
);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
