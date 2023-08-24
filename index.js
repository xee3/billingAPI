const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');

const app = express();
const port = 4000;

app.use(helmet());
app.use(bodyParser.json());

const db = new sqlite3.Database('print_jobs.db');

db.run(`
  CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,
    restaurantId TEXT,
    data TEXT
  )
`);

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

app.post('/generate-print-job', (req, res) => {
  try {
    const requestData = req.body;
    const restaurantId = requestData.restID;
    const printJobId = uuidv4();

    const stmt = db.prepare(
      'INSERT INTO print_jobs (id, restaurantId, data) VALUES (?, ?, ?)'
    );
    stmt.run(printJobId, restaurantId, JSON.stringify(requestData), (err) => {
      stmt.finalize();
      if (err) {
        console.error('Error inserting print job into database:', err);
        res.status(500).json({ error: 'Error generating print job.' });
      } else {
        res.status(200).json({ message: 'Print job request received.' });
      }
    });
  } catch (error) {
    console.error('Error processing print job request:', error);
    res.status(500).json({ error: 'Error generating print job.' });
  }
});

app.get('/get-print-jobs/:restaurantId', (req, res) => {
  try {
    const { restaurantId } = req.params;

    db.all(
      'SELECT * FROM print_jobs WHERE restaurantId = ?',
      [restaurantId],
      (err, rows) => {
        if (err) {
          console.error('Error retrieving print jobs from database:', err);
          res.status(500).json({ error: 'Error retrieving print jobs.' });
        } else {
          const printJobs = rows.map((row) => ({
            printJobId: row.id,
            printJobData: JSON.parse(row.data),
          }));
          res.json(printJobs);
        }
      }
    );
  } catch (error) {
    console.error('Error retrieving print jobs:', error);
    res.status(500).json({ error: 'Error retrieving print jobs.' });
  }
});

app.delete('/delete-print-job/:restaurantId/:printJobId', (req, res) => {
  try {
    const { restaurantId, printJobId } = req.params;

    db.run(
      'DELETE FROM print_jobs WHERE id = ? AND restaurantId = ?',
      [printJobId, restaurantId],
      (err) => {
        if (err) {
          console.error('Error deleting print job from database:', err);
          res.status(500).json({ error: 'Error deleting print job.' });
        } else {
          res.status(200).json({ message: 'Print job deleted.' });
        }
      }
    );
  } catch (error) {
    console.error('Error deleting print job:', error);
    res.status(500).json({ error: 'Error deleting print job.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
