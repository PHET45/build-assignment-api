import express from "express";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4001;
app.use(express.json());


app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});

app.get("/users", async (req, res) => {
  try {
    const result = await connectionPool.query("SELECT * FROM users");
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/assignments", async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ "message": "Server could not create assignment because there are missing data from client" });
    }
    
    const result = await connectionPool.query("INSERT INTO assignments (title, content, category) VALUES ($1, $2, $3)", [title, content, category]);
    return res.status(201).json({ "message": "Created assignment sucessfully" });
  } catch (error) {
    return res.status(500).json({ "message": "Server could not create assignment because database connection" });
  }
});

app.get("/assignments", async (req, res) => {
  try {
    const result = await connectionPool.query("SELECT * FROM assignments");
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ "message": "Server could not get assignments because database connection" });
  }
});

app.get("/assignments/:assignmentId", async (req, res) => {

  const assignmentId = req.params.assignmentId;
  try {
    const result = await connectionPool.query("SELECT * FROM assignments WHERE assignment_id = $1", [assignmentId]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ "message": "Server could not get assignment because database connection" });
  }
});

app.put("/assignments/:assignmentId", async (req, res) => {
  const assignmentId = req.params.assignmentId;
  const updateAssignment = {
    ...req.body,
    updated_at: new Date(),
  }
  try {
    const result = await connectionPool.query("UPDATE assignments SET title = $1, content = $2, category = $3 WHERE assignment_id = $4", [updateAssignment.title, updateAssignment.content, updateAssignment.category, assignmentId]);
    return res.status(200).json({ "message": "Updated assignment sucessfully" });
  } catch (error) {
    return res.status(500).json({ "message": "Server could not update assignment because database connection" });
  }
});

app.delete("/assignments/:assignmentId", async (req, res) => {
  const assignmentId = req.params.assignmentId;
  try {
    const result = await connectionPool.query("DELETE FROM assignments WHERE assignment_id = $1", [assignmentId]);
    return res.status(200).json({ "message": "Deleted assignment sucessfully" });
  }
  catch (error) {
    return res.status(500).json({ "message": "Server could not delete assignment because database connection" });
  }
});


app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
