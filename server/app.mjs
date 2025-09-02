import express from "express";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4001;

app.use(express.json());

// Resolve the primary key column for the `assignments` table at runtime and cache it
let cachedAssignmentsPkColumn = null;
async function getAssignmentsPkColumn() {
  if (cachedAssignmentsPkColumn) return cachedAssignmentsPkColumn;
  // Try to read primary key from pg_catalog
  const pkQuery = `
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'assignments'::regclass AND i.indisprimary = true
  `;
  try {
    const pkResult = await connectionPool.query(pkQuery);
    if (pkResult.rowCount > 0) {
      cachedAssignmentsPkColumn = pkResult.rows[0].column_name;
      return cachedAssignmentsPkColumn;
    }
  } catch (_) {
    // fall through to heuristics
  }

  // Heuristic fallback: prefer conventional names if exist
  try {
    const cols = await connectionPool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'assignments'
      ORDER BY ordinal_position
    `);
    const columnNames = cols.rows.map(r => r.column_name);
    const preferred = ["id", "assignment_id", "assignmentId"];
    const foundPreferred = preferred.find(name => columnNames.includes(name));
    cachedAssignmentsPkColumn = foundPreferred || columnNames[0];
    return cachedAssignmentsPkColumn;
  } catch (_) {
    // As a last resort, assume "id"
    cachedAssignmentsPkColumn = "id";
    return cachedAssignmentsPkColumn;
  }
}

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

// GET /assignments - list all assignments
app.get("/assignments", async (req, res) => {
  try {
    const pk = await getAssignmentsPkColumn();
    const result = await connectionPool.query(`SELECT * FROM assignments ORDER BY ${pk} ASC`);
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    console.error("Error reading assignments:", error);
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === '28P01' ||
      (typeof error.message === 'string' && error.message.includes('password authentication failed'))
    ) {
      return res.status(500).json({ "message": "Server could not read assignment because database connection" });
    }
    return res.status(500).json({ "message": "Server could not read assignment because database connection" });
  }
});

// GET /assignments/:assignmentId - get single assignment
app.get("/assignments/:assignmentId", async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;

    const pk = await getAssignmentsPkColumn();
    const result = await connectionPool.query(`SELECT * FROM assignments WHERE ${pk} = $1`, [assignmentId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ "message": "Server could not find a requested assignment" });
    }
    return res.status(200).json({ data: result.rows[0] });
  } catch (error) {
    console.error("Error reading single assignment:", error);
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === '28P01' ||
      (typeof error.message === 'string' && error.message.includes('password authentication failed'))
    ) {
      return res.status(500).json({ "message": "Server could not read assignment because database connection" });
    }
    return res.status(500).json({ "message": "Server could not read assignment because database connection" });
  }
});

// PUT /assignments/:assignmentId - update assignment
app.put("/assignments/:assignmentId", async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;

    const { title, content, category } = req.body || {};
    const pk = await getAssignmentsPkColumn();
    const result = await connectionPool.query(
      `UPDATE assignments SET title = $1, content = $2, category = $3 WHERE ${pk} = $4`,
      [title, content, category, assignmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ "message": "Server could not find a requested assignment to update" });
    }

    return res.status(200).json({ "message": "Updated assignment sucessfully" });
  } catch (error) {
    console.error("Error updating assignment:", error);
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === '28P01' ||
      (typeof error.message === 'string' && error.message.includes('password authentication failed'))
    ) {
      return res.status(500).json({ "message": "Server could not update assignment because database connection" });
    }
    return res.status(500).json({ "message": "Server could not update assignment because database connection" });
  }
});

// DELETE /assignments/:assignmentId - delete assignment
app.delete("/assignments/:assignmentId", async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;

    const pk = await getAssignmentsPkColumn();
    const result = await connectionPool.query(
      `DELETE FROM assignments WHERE ${pk} = $1`,
      [assignmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ "message": "Server could not find a requested assignment to delete" });
    }

    return res.status(200).json({ "message": "Deleted assignment sucessfully" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === '28P01' ||
      (typeof error.message === 'string' && error.message.includes('password authentication failed'))
    ) {
      return res.status(500).json({ "message": "Server could not delete assignment because database connection" });
    }
    return res.status(500).json({ "message": "Server could not delete assignment because database connection" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
