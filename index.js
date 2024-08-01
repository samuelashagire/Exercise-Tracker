import express from 'express';
import dotenv from 'dotenv';
import mongoose, { Schema } from 'mongoose';

dotenv.config();

const { PORT, MONGO_URI } = process.env;

// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4,
});
const db = mongoose.connection;

db.on('error', console.error);
db.once('open', () => {
  console.log('Connected to MongoDB Atlas');
});

// Application level middlewares
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongeDB Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// APIs
app.post('/api/users', async (req, res) => {
  const name = req.body.username;
  console.log(name);

  const user = new User({
    username: name,
  });

  await User.deleteMany();
  const result = await user.save();
  if (!result) return console.error(err);
  console.log('user saved successfully');
  res.json({ username: result.username, _id: result._id });
});

app.get('/api/users', async (req, res) => {
  console.log('Getting all users');
  const users = await User.find({}, 'username _id').exec();
  if (!users) return console.error('no user exists');
  console.log('users found successfully');
  res.send(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  let { description, duration, date } = req.body;

  if (!date) date = new Date().toDateString();

  const user = await User.findById({ _id: id });
  if (!user) res.json({ message: 'user not found!' });

  const savedExercise = await Exercise.create({
    username: user.username,
    description,
    duration: parseInt(duration),
    date,
  });

  const exercise = {
    username: savedExercise.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString(),
    _id: user.id,
  };

  res.send(exercise);
});

app.get('/api/users/:_id/logs', async function (req, res) {
  const id = req.params._id;
  const { from, to, limit } = req.query;

  const user = await User.findOne({ _id: id });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const query = { username: user.username };
  if (from) {
    query.date = { $gte: new Date(from) };
  }
  if (to) {
    if (!query.date) query.date = {};
    query.date.$lte = new Date(to);
  }

  let logsQuery = Exercise.find(query);
  if (limit) {
    logsQuery = logsQuery.limit(parseInt(limit));
  }

  const logs = await logsQuery;

  const completeLogs = logs.map((e) => {
    return {
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    };
  });

  res.json({
    username: user.username,
    count: logs.length,
    _id: user._id,
    log: completeLogs,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});