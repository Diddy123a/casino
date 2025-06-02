require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(403);
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: hash, balance: 1000 });
  res.json({ message: 'User created' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.sendStatus(401);
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.sendStatus(401);
  const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET);
  res.json({ token, balance: user.balance });
});

app.post('/api/balance', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { balance: req.body.balance });
  res.sendStatus(200);
});

app.get('/api/leaderboard', async (req, res) => {
  const top = await User.find().sort({ balance: -1 }).limit(10);
  res.json(top.map(u => ({ username: u.username, balance: u.balance })));
});

app.get('/api/chat', async (req, res) => {
  const msgs = await Message.find().sort({ createdAt: -1 }).limit(50);
  res.json(msgs.reverse());
});

io.on('connection', socket => {
  socket.on('chat', async (data) => {
    const message = await Message.create({ user: data.user, text: data.text });
    io.emit('chat', message);
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running'));