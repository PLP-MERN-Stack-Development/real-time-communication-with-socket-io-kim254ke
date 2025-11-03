import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ---------------- MONGOOSE SETUP ----------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ---------------- MESSAGE MODEL ----------------
const messageSchema = new mongoose.Schema(
  {
    username: String,
    room: String,
    content: String,
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

// ---------------- EXPRESS ROUTES ----------------

// Fetch all messages for a room
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SOCKET.IO HANDLERS ----------------
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // Join a room
  socket.on('joinRoom', async (room) => {
    socket.join(room);
    console.log(`📥 ${socket.id} joined room: ${room}`);

    // Send room history on join
    const roomMessages = await Message.find({ room }).sort({ createdAt: 1 });
    socket.emit('roomMessages', roomMessages);
  });

  // Send a new message
  socket.on('sendMessage', async ({ username, room, content }) => {
    try {
      const message = new Message({ username, room, content });
      await message.save();
      io.to(room).emit('messageReceived', message);
      console.log(`💬 New message from ${username} in ${room}`);
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  // ✅ Edit Message
  socket.on('editMessage', async ({ messageId, newText, room }) => {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { content: newText, edited: true },
        { new: true }
      );

      if (updated) {
        io.to(room).emit('messageEdited', {
          messageId,
          newText,
          edited: true,
        });
        console.log(`✏️ Message edited (${messageId}) in ${room}`);
      }
    } catch (err) {
      console.error('❌ Error editing message:', err);
    }
  });

  // ✅ Delete Message
  socket.on('deleteMessage', async ({ messageId, room }) => {
    try {
      const deleted = await Message.findByIdAndDelete(messageId);
      if (deleted) {
        io.to(room).emit('messageDeleted', { messageId });
        console.log(`🗑️ Message deleted (${messageId}) from ${room}`);
      }
    } catch (err) {
      console.error('❌ Error deleting message:', err);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// ---------------- SERVER START ----------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
