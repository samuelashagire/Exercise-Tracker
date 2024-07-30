require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3001;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User and Exercise schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});
const exerciseSchema = new mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, default: () => new Date().toDateString() },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Create a new user
app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const newUser = new User({ username });
  await newUser.save();
  res.json({ username: newUser.username, _id: newUser._id });
});

// Get a list of all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, { __v: 0 });
  res.json(users);
});

// Add an exercise for a user
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const exerciseDate = date
    ? new Date(date).toDateString()
    : new Date().toDateString();

  const newExercise = new Exercise({
    username: user.username,
    description,
    duration,
    date: exerciseDate,
  });

  await newExercise.save();

  res.json({
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date,
    _id: userId,
  });
});

// Get exercise log for a user
app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const user = await User.findById(userId);

  if (!user) return res.status(404).json({ error: "User not found" });

  let exercises = await Exercise.find({ username: user.username });

  // Date filtering only if `from` or `to` is provided
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    exercises = exercises.filter((exercise) => {
      const exerciseDate = new Date(exercise.date);
      return (
        (!fromDate || exerciseDate >= fromDate) &&
        (!toDate || exerciseDate <= toDate)
      );
    });
  }

  // Limit the number of logs returned if `limit` is provided
  if (limit) {
    exercises = exercises.slice(0, parseInt(limit, 10));
  }

  // Return the response with user data and log of exercises
  res.json({
    _id: userId,
    username: user.username,
    count: exercises.length,
    log: exercises,
  });
});

app.listen(port, () => {
  console.log("Your app is listening on port " + port);
});