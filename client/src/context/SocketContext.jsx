// ==========================================
// client/src/context/SocketContext.jsx
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
      setMessages((prev) => [...prev, message]);
    });
    socket.on('message_history', (history) => {
      setMessages(history);
    });
    socket.on('private_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // User events
    socket.on('user_list', (userList) => {
      setUsers(userList);
    });
    socket.on('user_joined', (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });
    socket.on('user_left', (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    // Typing events
    socket.on('typing_users', (users) => {
      setTypingUsers(users);
    });

    // Room events
    socket.on('room_joined', ({ room }) => {
      setCurrentRoom(room);
    });

    // Cleanup: Remove all listeners when the component unmounts
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('receive_message');
      socket.off('message_history');
      socket.off('private_message');
      socket.off('user_list');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('typing_users');
      socket.off('room_joined');
    };
  }, []);

  const connect = (username) => {
    socket.connect();
    socket.emit('user_join', username);
  };
  const disconnect = () => {
    socket.disconnect();
  };
  const sendMessage = (message, room = 'general') => {
    socket.emit('send_message', { message, room });
  };
  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };
  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };
  const joinRoom = (room) => {
    socket.emit('join_room', room);
    setCurrentRoom(room);
  };
  const leaveRoom = (room) => {
    socket.emit('leave_room', room);
  };
  const addReaction = (messageId, emoji) => {
    socket.emit('add_reaction', { messageId, emoji });
  };
  const markMessageAsRead = (messageId) => {
    socket.emit('message_read', messageId);
  };

  const value = {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    currentRoom,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    joinRoom,
    leaveRoom,
    addReaction,
    markMessageAsRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};