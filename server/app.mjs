import express from "express";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4001;

app.use(express.json());

app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});


// เพิ่ม endpoint สำหรับดู table schema
app.get("/table-info", async (req, res) => {
  try {
    const result = await connectionPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'assignments'
      ORDER BY ordinal_position
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting table info:', error);
    res.status(500).json({ "message": "Error getting table info" });
  }
});


app.post("/assignments", async (req, res) => {
  try {
    const newPost = {...req.body};
    await connectionPool.query("INSERT INTO assignments (title, content, category) VALUES ($1, $2, $3) RETURNING *",
       [newPost.title, 
        newPost.content, 
        newPost.category
      ]
    );
    res.status(201).json({ "message": "Assignment created successfully" });

  } catch (error) {
    // เพิ่ม console.error เพื่อดู error ที่เกิดขึ้นจริง
    console.error('Error creating assignment:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      res.status(500).json({ 
          "message": "Server could not create assignment because database connection failed" 
      });
    } else if (error.code === '23502') { // PostgreSQL constraint violation
      res.status(400).json({ 
          "message": "Server could not create assignment because there are missing data from client" 
      });
    } else {
      res.status(500).json({ 
          "message": "Internal server error occurred while creating assignment" 
      });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
