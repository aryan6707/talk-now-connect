
import React, { useContext, useEffect } from 'react';
import { Search, LogOut, User, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AuthContext from '../context/AuthContext';
import ChatContext from '../context/ChatContext';

const ChatSidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { contacts, fetchContacts, activeContact, setCurrentContact } = useContext(ChatContext);
  
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);
  
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="h-screen flex flex-col border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Talk Now</h1>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Contacts</h2>
            <Button variant="ghost" size="icon" title="Add Contact">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          <Separator className="my-2" />
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-1 py-1">
              {contacts.length > 0 ? (
                contacts.map(contact => (
                  <button
                    key={contact.id}
                    className={`w-full flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors ${
                      activeContact && activeContact.id === contact.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setCurrentContact(contact)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      {contact.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{contact.name}</div>
                      <p className="text-xs text-muted-foreground">
                        {contact.online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="mx-auto h-10 w-10 mb-2" />
                  <p>No contacts found</p>
                  <p className="text-xs">Add contacts to start chatting</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">{user ? user.name : 'User'}</div>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
