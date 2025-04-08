
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';
import { toast } from 'sonner';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
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
      toast.error('Connection error: ' + err.message);
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
      console.log('Received new message:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
      
      // If message is from active contact, mark as read
      if (activeContact && message.senderId === activeContact.id) {
        markMessageAsRead(message.id);
      } else {
        // Notification for message from non-active contact
        const sender = contacts.find(c => c.id === message.senderId);
        if (sender) {
          toast(`New message from ${sender.name}`);
        }
      }
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
  }, [socket, activeContact, contacts]);
  
  // Fetch contacts/users
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const data = await response.json();
      // Filter out current user from contacts list
      const filteredContacts = data.filter(contact => contact.id !== user?.id);
      setContacts(filteredContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [token, user]);
  
  // Set current contact and fetch messages
  const setCurrentContact = useCallback(async (contact) => {
    setActiveContact(contact);
    
    if (!user || !contact) return;
    
    try {
      setLoading(true);
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
      
      // Mark unread messages as read
      data.forEach(message => {
        if (!message.isRead && message.senderId === contact.id) {
          markMessageAsRead(message.id);
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user, token]);
  
  // Send message
  const sendMessage = useCallback((content, receiverId) => {
    if (!socket || !user || !content.trim()) return;
    
    try {
      const message = {
        senderId: user.id,
        receiverId,
        content,
        timestamp: new Date()
      };
      
      // Add optimistic message to local state
      const optimisticMessage = {
        ...message,
        id: 'temp-' + Date.now(),
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
      
      // Send via socket
      socket.emit('private_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
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
    if (!socket || !messageId) return;
    
    // Update local state first
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ));
    
    // Then notify server
    socket.emit('mark_read', { messageId });
    
    // Also send API request to update in database
    if (token && !messageId.toString().startsWith('temp-')) {
      fetch(`http://localhost:5000/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(err => console.error('Error marking message as read:', err));
    }
  }, [socket, token]);
  
  return (
    <ChatContext.Provider
      value={{
        socket,
        messages,
        contacts,
        activeContact,
        typingUsers,
        loading,
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
