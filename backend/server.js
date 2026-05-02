const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db.js')

dotenv.config();

connectDB();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://team-task-manager-ecru.vercel.app/'  ],
  credentials: true
}));app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/projects', require('./routes/projectRoutes.js'));
app.use('/api/tasks', require('./routes/taskRoutes.js'));

app.get('/', (req, res) => {
  res.send('Team Task Manager API is running...');
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});