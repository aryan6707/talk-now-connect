
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from './MessageBubble';
import ChatContext from '../context/ChatContext';
import AuthContext from '../context/AuthContext';
import { cn } from '@/lib/utils';

const ChatWindow = () => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useContext(AuthContext);
  const { 
    activeContact, 
    messages, 
    sendMessage, 
    typingUsers,
    sendTypingIndicator 
  } = useContext(ChatContext);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle typing indicator
  useEffect(() => {
    if (isTyping) {
      sendTypingIndicator(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }
    
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isTyping, sendTypingIndicator]);
  
  const handleChange = (e) => {
    setMessage(e.target.value);
    if (!isTyping) setIsTyping(true);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeContact) return;
    
    sendMessage(message, activeContact.id);
    setMessage('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };
  
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };
  
  // Show empty state if no contact is selected
  if (!activeContact) {
    return (
      <div className="h-screen flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Select a contact to start chatting</h3>
          <p className="text-muted-foreground">Your messages will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex-1 flex flex-col">
      {/* Chat header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>{getInitials(activeContact.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{activeContact.name}</h3>
            <p className="text-xs text-muted-foreground">
              {activeContact.online ? 'Online' : 'Offline'}
              {typingUsers[activeContact.id] && ' • Typing...'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id || index}
              message={msg}
              isOwnMessage={msg.senderId === user?.id}
            />
          ))}
          {typingUsers[activeContact.id] && (
            <div className="flex mb-4">
              <div className="bg-secondary text-foreground rounded-2xl rounded-bl-none px-4 py-2">
                <div className="flex space-x-1 typing-indicator">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Message input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={message}
            onChange={handleChange}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="shrink-0"
            disabled={!message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
