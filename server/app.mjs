import express from "express";
import connectionPool from "./utils/db.mjs";
const app = express();
const port = 4001;

app.use(express.json());

app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});

app.post("/assignments", async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({
      message: "Server could not create assignment because there are missing data from client",
    });
  }

  const newPost = {
    ...req.body,
    created_at: new Date(),
    updated_at: new Date(),
    published_at: new Date(),
  }
  try {
    await connectionPool.query(
      `INSERT INTO assignments(title, content, category,created_at, updated_at, published_at)
      VALUES($1, $2, $3, $4, $5, $6)`,
      [
        newPost.title,
        newPost.content,
        newPost.category,
        newPost.created_at,
        newPost.updated_at,
        newPost.published_at,
      ]
    )
  } catch (error) {
    return res.status(500).json({
      message: "Server could not create assignment because database connection",
    });
  } 
  return res.status(201).json({
    message: "Created assignment sucessfully"
  });
});

app.get("/assignments", async (req, res) => {
  let results;
  try {
    results = await connectionPool.query("SELECT * FROM assignments");
  } catch {
    return res.status(500).json({
      message: "Server could not get assignments because database connection",
    });
  }
  return res.status(200).json({
    data: results.rows, 
  });
})

app.get("/assignments/:assignmentId", async (req, res) => {
  const postId = req.params.assignmentId;

  let results;
  try {
    results = await connectionPool.query("SELECT * FROM assignments WHERE assignment_id=$1", [postId]);
  } catch (error) {
    return res.status(500).json({
      message: "Server could not get assignment because database connection",
    });
  }
  if (!results.rows[0]) {
    return res.status(404).json({
      message: "Server could not find a requested assignment",
    });
  }
  return res.status(200).json({
    data: results.rows[0],
  });
})

app.put("/assignments/:assignmentId", async (req, res) => {
  const postId = req.params.assignmentId;
  const updatedPost = {...req.body , updated_at: new Date()};

  let results;
  try {
      results = await connectionPool.query(
      `UPDATE assignments
      set title=$2, content=$3, category=$4, updated_at=$5
      WHERE assignment_id=$1 RETURNING *`,
      [
        postId,
        updatedPost.title,
        updatedPost.content,
        updatedPost.category,
        updatedPost.updated_at,
      ]
    )
  }catch { 
    return res.status(500).json({
      message: "Server could not update assignment because database connection",
    });
  }
  if (!results.rows[0]) {
    return res.status(404).json({
      message: "Server could not find a requested assignment to update",
    });
  }
  return res.status(200).json({
    message: "Updated assignment successfully",
  });
});

app.delete("/assignments/:assignmentId", async (req, res) => {
  const postId = req.params.assignmentId;

  let results;
  try{
    results = await connectionPool.query(
      "DELETE FROM assignments WHERE assignment_id=$1 RETURNING *",
      [postId]
    )
  }catch {
    return res.status(500).json({
      message: "Server could not delete assignment because database connection",
    });
  }
  if (!results.rows[0]) {
    return res.status(404).json({
      message: "Server could not find a requested assignment to delete",
    });
  } else {
    return res.status(200).json({
      message: "Deleted assignment successfully",
    });
  }
})

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
