import express from "express";
import postsRouter from "./routes/posts.js";

const app = express();

app.use(express.json());

// Temporary authentication for local testing only
app.use((req, _res, next) => {
  req.user = { id: 1 };
  next();
});

app.use("/posts", postsRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Threadbase Vote API is running" });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
