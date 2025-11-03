// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========================
//  MongoDB Connection
// ========================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ========================
//  MongoDB Schemas
// ========================
const messageSchema = new mongoose.Schema({
  sender: String,
  senderId: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false },
});

const Message = mongoose.model('Message', messageSchema);

// ========================
//  In-memory Data Stores
// ========================
const users = {};
const typingUsers = {};

// ========================
//  Socket.io Logic
// ========================
io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`👤 ${username} joined the chat`);
  });

  // Handle sending a chat message
  socket.on('send_message', async (messageData) => {
    if (!users[socket.id]) return;

    const message = {
      sender: users[socket.id].username,
      senderId: socket.id,
      message: messageData.message,
      timestamp: new Date(),
      isPrivate: false,
    };

    try {
      const savedMessage = await Message.create(message);
      io.emit('receive_message', savedMessage);
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      if (isTyping) typingUsers[socket.id] = username;
      else delete typingUsers[socket.id];
      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on('private_message', async ({ to, message }) => {
    if (!users[socket.id]) return;

    const messageData = {
      sender: users[socket.id].username,
      senderId: socket.id,
      message,
      timestamp: new Date(),
      isPrivate: true,
    };

    try {
      const savedPrivateMessage = await Message.create(messageData);
      socket.to(to).emit('private_message', savedPrivateMessage);
      socket.emit('private_message', savedPrivateMessage);
    } catch (err) {
      console.error('❌ Error saving private message:', err);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`🔴 ${username} left the chat`);
    }

    delete users[socket.id];
    delete typingUsers[socket.id];

    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// ========================
//  API Routes
// ========================
app.get('/api/messages', async (req, res) => {
  try {
    const msgs = await Message.find().sort({ timestamp: 1 }).limit(100);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// ========================
//  Start Server
// ========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ========================
//  Graceful Shutdown
// ========================
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down...');
  io.close();
  server.close(() => {
    console.log('✅ Server closed.');
    mongoose.connection.close(false, () => {
      console.log('🧩 MongoDB connection closed.');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };
