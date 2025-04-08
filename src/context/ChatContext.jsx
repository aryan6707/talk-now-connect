
import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import AuthContext from './AuthContext';
import { toast } from 'sonner';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);
  
  // Socket event listeners
  useEffect(() => {
    if (socket && user) {
      // Let server know user is online
      socket.emit('user_online', user.id);
      
      // Listen for new messages
      socket.on('new_message', (message) => {
        setMessages(prevMessages => [...prevMessages, message]);
        
        // Notify if message is from someone other than active contact
        if (activeContact && message.senderId !== activeContact.id) {
          toast.info(`New message from ${message.senderName || 'a user'}`);
        }
      });
      
      // Listen for typing indicators
      socket.on('typing_indicator', ({ senderId, isTyping }) => {
        setTypingUsers(prev => ({
          ...prev,
          [senderId]: isTyping
        }));
      });
      
      // Listen for user status changes
      socket.on('user_status', ({ userId, online }) => {
        setContacts(prevContacts => 
          prevContacts.map(contact => 
            contact.id === userId 
              ? { ...contact, online } 
              : contact
          )
        );
      });
      
      // Listen for read receipts
      socket.on('message_read', ({ messageId }) => {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId 
              ? { ...msg, isRead: true } 
              : msg
          )
        );
      });
    }
  }, [socket, user, activeContact]);
  
  // Fetch contacts
  const fetchContacts = async () => {
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
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch messages for active contact
  const fetchMessages = async (contactId) => {
    if (!token || !contactId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/messages?userId=${user.id}&receiverId=${contactId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
      
      // Mark received messages as read
      data.forEach(message => {
        if (message.senderId === contactId && !message.isRead) {
          markMessageAsRead(message.id);
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  // Send a message
  const sendMessage = (content, receiverId, isGroupMessage = false) => {
    if (!socket || !user) return;
    
    const message = {
      senderId: user.id,
      senderName: user.name,
      receiverId,
      content,
      timestamp: new Date(),
      isGroupMessage
    };
    
    // Emit the message via socket
    socket.emit('private_message', message);
    
    // Update local state
    setMessages(prevMessages => [...prevMessages, {
      ...message,
      isRead: false
    }]);
    
    // Also send via API for persistence
    fetch('http://localhost:5000/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content, receiverId, isGroupMessage })
    }).catch(error => console.error('Error sending message via API:', error));
  };
  
  // Mark message as read
  const markMessageAsRead = (messageId) => {
    if (!socket || !user) return;
    
    socket.emit('mark_read', { messageId, userId: user.id });
    
    // Update local state
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, isRead: true } 
          : msg
      )
    );
  };
  
  // Send typing indicator
  const sendTypingIndicator = (isTyping) => {
    if (!socket || !user || !activeContact) return;
    
    if (isTyping) {
      socket.emit('typing', { senderId: user.id, receiverId: activeContact.id });
    } else {
      socket.emit('stop_typing', { senderId: user.id, receiverId: activeContact.id });
    }
  };
  
  // Change active contact
  const setCurrentContact = (contact) => {
    setActiveContact(contact);
    if (contact) {
      fetchMessages(contact.id);
    } else {
      setMessages([]);
    }
  };
  
  return (
    <ChatContext.Provider
      value={{
        socket,
        contacts,
        messages,
        activeContact,
        typingUsers,
        loading,
        fetchContacts,
        fetchMessages,
        sendMessage,
        markMessageAsRead,
        sendTypingIndicator,
        setCurrentContact
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
