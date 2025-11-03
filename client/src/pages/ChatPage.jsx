// client/src/pages/ChatPage.jsx - ENHANCED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Bell, Download, Settings } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../hooks/useNotification';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import UserList from '../components/UserList';
import RoomList from '../components/RoomList';

const ChatPage = ({ username, onLogout }) => {
  const {
    isConnected,
    messages,
    users,
    typingUsers,
    currentRoom,
    disconnect,
    sendMessage,
    setTyping,
    joinRoom,
  } = useSocket();

  const { notify } = useNotification();
  const [rooms] = useState(['general', 'random', 'tech', 'gaming']);
  const [showUsers, setShowUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [reactions, setReactions] = useState({});
  const messagesEndRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newMessage = messages[messages.length - 1];
      
      if (newMessage && !newMessage.system && newMessage.sender !== username) {
        if (newMessage.room !== currentRoom) {
          setUnreadCounts((prev) => ({
            ...prev,
            [newMessage.room]: (prev[newMessage.room] || 0) + 1,
          }));
          setNotifications((prev) => prev + 1);
          notify(newMessage);
        }
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentRoom, username, notify]);

  const handleRoomChange = (room) => {
    joinRoom(room);
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      const roomUnread = newCounts[room] || 0;
      newCounts[room] = 0;
      setNotifications((n) => Math.max(0, n - roomUnread));
      return newCounts;
    });
  };

  const handleSendMessage = (message) => {
    sendMessage(message, currentRoom);
  };

  const handleImageUpload = (image, caption) => {
    // Convert image to base64 for demo
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result;
      // Send message with image
      sendMessage(caption || 'Sent an image', currentRoom);
      // In production, you'd upload to a server and send the URL
    };
    reader.readAsDataURL(image);
  };

  const handleLogout = () => {
    disconnect();
    onLogout();
  };

  const handleAddReaction = (messageId, emoji) => {
    setReactions((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), emoji],
    }));
  };

  const handleEditMessage = (messageId, newText) => {
    // In production, emit socket event to edit message
    console.log('Edit message:', messageId, newText);
  };

  const handleDeleteMessage = (messageId) => {
    // In production, emit socket event to delete message
    console.log('Delete message:', messageId);
  };

  // In ChatPage.jsx - handlePrivateMessage
const handlePrivateMessage = (userId, username) => {
    const privateRoomId = `private-${Math.min(userId, socket.id)}-${Math.max(userId, socket.id)}`;
    joinRoom(privateRoomId);
    // Open private chat UI
  };

  const handleExportChat = () => {
    const chatData = filteredMessages.map(msg => 
      `[${new Date(msg.timestamp).toLocaleString()}] ${msg.sender}: ${msg.message}`
    ).join('\n');
    
    const blob = new Blob([chatData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentRoom}-${new Date().toISOString()}.txt`;
    a.click();
  };

  const filteredMessages = messages
    .filter((msg) => !msg.room || msg.room === currentRoom)
    .filter(
      (msg) =>
        searchQuery === '' ||
        msg.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="flex h-screen bg-gray-100">
      <RoomList
        rooms={rooms}
        currentRoom={currentRoom}
        onRoomChange={handleRoomChange}
        unreadCounts={unreadCounts}
        notifications={notifications}
        username={username}
        onLogout={handleLogout}
        isConnected={isConnected}
      />

      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  #{currentRoom}
                  {!isConnected && (
                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      Reconnecting...
                    </span>
                  )}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <span>{users.length} members online</span>
                  {typingUsers.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-purple-600 animate-pulse">
                        {typingUsers.length} typing...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 w-64"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Export Chat */}
              <button
                onClick={handleExportChat}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Export chat"
              >
                <Download className="w-6 h-6 text-gray-600" />
              </button>

              {/* Notifications */}
              {notifications > 0 && (
                <div className="relative">
                  <Bell className="w-6 h-6 text-gray-600" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {notifications}
                  </span>
                </div>
              )}

              {/* Users Toggle */}
              <button
                onClick={() => setShowUsers(!showUsers)}
                className={`p-2 hover:bg-gray-100 rounded-lg transition ${showUsers ? 'bg-purple-100' : ''}`}
                title="Show users"
              >
                <Users className={`w-6 h-6 ${showUsers ? 'text-purple-600' : 'text-gray-600'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold">
                {searchQuery
                  ? 'No messages found'
                  : 'No messages yet'}
              </p>
              <p className="text-sm mt-2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start the conversation!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || idx}
                  message={msg}
                  isOwnMessage={msg.sender === username}
                  onAddReaction={handleAddReaction}
                  reactions={reactions[msg.id]}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                />
              ))}
            </div>
          )}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="text-sm text-gray-500 italic mt-4 flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Message Input */}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onTyping={setTyping}
          onImageUpload={handleImageUpload}
        />
      </div>

      {/* Enhanced User List */}
      {showUsers && (
        <UserList 
          users={users} 
          onClose={() => setShowUsers(false)}
          currentUser={username}
          onPrivateMessage={handlePrivateMessage}
        />
      )}
    </div>
  );
};

export default ChatPage;