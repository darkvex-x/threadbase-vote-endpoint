import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.post("/:id/vote", async (req, res, next) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId) || postId <= 0) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const userId = req.user.id;

  try {
    const [updatedPost] = await prisma.$transaction([
      prisma.post.update({
        where: { id: postId },
        data: { score: { increment: 1 } },
        select: { id: true, score: true },
      }),
      prisma.vote.create({
        data: { userId, postId },
      }),
    ]);

    res.status(201).json({
      message: "Vote recorded successfully",
      postId: updatedPost.id,
      score: updatedPost.score,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res.status(409).json({ error: "You have already voted on this post" });
        return;
      }

      if (error.code === "P2025" || error.code === "P2003") {
        res.status(404).json({ error: "Post not found" });
        return;
      }
    }

    next(error);
  }
});

export default router;
