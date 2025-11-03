// ==========================================
// client/src/context/SocketContext.jsx - FIXED & ENHANCED
// ==========================================
import React, { createContext, useContext, useEffect, useState } from 'react';
import socket from '../socket/socket';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Message events
    socket.on('receive_message', (message) => {
      console.log('📩 Received message:', message);
      setMessages((prev) => [...prev, message]);
    });
    
    socket.on('message_history', (history) => {
      console.log('📜 Received message history:', history.length, 'messages');
      setMessages(history);
    });
    
    socket.on('message_updated', (updatedMessage) => {
      console.log('🔄 Message updated:', updatedMessage.id);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    });

    // User events
    socket.on('user_list', (userList) => {
      console.log('👥 User list updated:', userList.length, 'users');
      setUsers(userList);
    });
    
    socket.on('notification', (notification) => {
      console.log('🔔 Notification:', notification.message);
      // Add system message for notifications
      setMessages((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}`,
          system: true,
          message: notification.message,
          timestamp: new Date().toISOString(),
          room: notification.room,
        },
      ]);
    });

    // Typing events
    socket.on('typing_users', (users) => {
      setTypingUsers(users);
    });

    // Room events
    socket.on('room_joined', (room) => {
      console.log('🚪 Joined room:', room);
      setCurrentRoom(room);
    });

    socket.on('available_rooms', (rooms) => {
      console.log('🏠 Available rooms:', rooms);
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('receive_message');
      socket.off('message_history');
      socket.off('message_updated');
      socket.off('user_list');
      socket.off('notification');
      socket.off('typing_users');
      socket.off('room_joined');
      socket.off('available_rooms');
    };
  }, []);

  // ===== CONNECTION =====
  const connect = (user) => {
    setUsername(user);
    socket.connect();
    socket.emit('user_join', user);
  };

  const disconnect = () => {
    socket.disconnect();
    setUsername('');
  };

  // ===== MESSAGING =====
  const sendMessage = (message, room = null) => {
    const targetRoom = room || currentRoom;
    console.log('📤 Sending message to room:', targetRoom, '- Message:', message);
    
    socket.emit('send_message', { 
      message, 
      room: targetRoom 
    });

    // Optimistic UI update - add message immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender: username,
      senderId: socket.id,
      message,
      room: targetRoom,
      timestamp: new Date().toISOString(),
      delivered: false,
      read: false,
      reactions: [],
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
  };

  const sendImage = (imageData, caption, room = null) => {
    const targetRoom = room || currentRoom;
    console.log('📤 Sending image to room:', targetRoom);
    
    socket.emit('send_message', { 
      message: caption || 'Sent an image', 
      room: targetRoom,
      image: imageData // Send base64 image
    });

    // Optimistic UI update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender: username,
      senderId: socket.id,
      message: caption || '',
      image: imageData,
      room: targetRoom,
      timestamp: new Date().toISOString(),
      delivered: false,
      read: false,
      reactions: [],
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
  };

  const sendPrivateMessage = (toUserId, message) => {
    console.log('📤 Sending private message to:', toUserId);
    socket.emit('private_message', { toUserId, message });
  };

  // ===== TYPING =====
  const setTyping = (isTyping) => {
    if (isTyping) {
      socket.emit('typing_start');
    } else {
      socket.emit('typing_stop');
    }
  };

  // ===== ROOMS =====
  const joinRoom = (room) => {
    console.log('🚪 Joining room:', room);
    socket.emit('join_room', room);
    setCurrentRoom(room);
  };

  // ===== REACTIONS =====
  const addReaction = (messageId, emoji) => {
    console.log('👍 Adding reaction to message:', messageId, '- Emoji:', emoji);
    socket.emit('add_reaction', { messageId, emoji });
  };

  // ===== READ RECEIPTS =====
  const markMessageAsRead = (messageId) => {
    console.log('✅ Marking message as read:', messageId);
    socket.emit('message_read', { messageId });
  };

  const value = {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    currentRoom,
    username,
    connect,
    disconnect,
    sendMessage,
    sendImage,
    sendPrivateMessage,
    setTyping,
    joinRoom,
    addReaction,
    markMessageAsRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};