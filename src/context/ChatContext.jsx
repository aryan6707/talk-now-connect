
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const { user, token } = useContext(AuthContext);
  
  // Initialize socket connection when token is available
  useEffect(() => {
    if (!token) return;
    
    // Connect to socket server with auth token
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
    
    setSocket(newSocket);
    
    // Clean up socket connection on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Listen for incoming messages
    socket.on('new_message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });
    
    // Listen for typing indicators
    socket.on('typing_indicator', ({ senderId, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [senderId]: isTyping
      }));
    });
    
    // Listen for read receipts
    socket.on('message_read', ({ messageId }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    });
    
    // Listen for user status changes
    socket.on('user_status', ({ userId, online }) => {
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === userId ? { ...contact, online } : contact
        )
      );
    });
    
    return () => {
      socket.off('new_message');
      socket.off('typing_indicator');
      socket.off('message_read');
      socket.off('user_status');
    };
  }, [socket]);
  
  // Fetch contacts/users
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [token]);
  
  // Set current contact and fetch messages
  const setCurrentContact = useCallback(async (contact) => {
    setActiveContact(contact);
    
    if (!user || !contact) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/messages?userId=${user.id}&receiverId=${contact.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user, token]);
  
  // Send message
  const sendMessage = useCallback((content, receiverId) => {
    if (!socket || !user) return;
    
    const message = {
      senderId: user.id,
      receiverId,
      content,
      timestamp: new Date()
    };
    
    // Add message to local state
    setMessages((prevMessages) => [...prevMessages, message]);
    
    // Send via socket
    socket.emit('private_message', message);
  }, [socket, user]);
  
  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping) => {
    if (!socket || !user || !activeContact) return;
    
    socket.emit(
      isTyping ? 'typing' : 'stop_typing',
      { senderId: user.id, receiverId: activeContact.id }
    );
  }, [socket, user, activeContact]);
  
  // Mark message as read
  const markMessageAsRead = useCallback((messageId) => {
    if (!socket) return;
    
    socket.emit('mark_read', { messageId });
  }, [socket]);
  
  return (
    <ChatContext.Provider
      value={{
        socket,
        messages,
        contacts,
        activeContact,
        typingUsers,
        fetchContacts,
        setCurrentContact,
        sendMessage,
        sendTypingIndicator,
        markMessageAsRead
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
