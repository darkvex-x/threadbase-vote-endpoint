import { prisma } from "../lib/prisma.js";

async function main() {
  let user = await prisma.user.findUnique({ where: { id: 1 } });

  if (!user) {
    user = await prisma.user.create({
      data: { id: 1, name: "Test User" },
    });
  }

  let post = await prisma.post.findFirst({
    where: { title: "Vote Test Post" },
  });

  if (!post) {
    post = await prisma.post.create({
      data: {
        title: "Vote Test Post",
        body: "A post for testing the voting endpoint.",
      },
    });
  }

  console.log("Test user ID:", user.id);
  console.log("Test post ID:", post.id);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
