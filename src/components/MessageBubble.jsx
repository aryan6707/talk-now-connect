
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const MessageBubble = ({ message, isOwnMessage }) => {
  const formattedTime = message.timestamp ? format(new Date(message.timestamp), 'h:mm a') : '';
  
  return (
    <div
      className={cn(
        'flex mb-4',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isOwnMessage
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-secondary text-foreground rounded-bl-none'
        )}
      >
        <div className="break-words">{message.content}</div>
        <div className="flex items-center justify-end mt-1 space-x-1">
          <span className="text-xs opacity-70">{formattedTime}</span>
          {isOwnMessage && (
            message.isRead 
              ? <CheckCheck className="h-3 w-3 opacity-70" /> 
              : <Check className="h-3 w-3 opacity-70" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
