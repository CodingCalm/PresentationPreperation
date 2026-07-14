import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { FaPaperPlane, FaRobot, FaUser, FaMicrophoneAlt } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  error: string | null;
  showFollowUpRecordButton?: boolean;
  isActuallyRecording?: boolean;
  isChatProcessingAudio?: boolean;
  onFollowUpRecord?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  error,
  showFollowUpRecordButton,
  isActuallyRecording,
  isChatProcessingAudio,
  onFollowUpRecord
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-[400px] md:h-[calc(100%-2rem)] bg-gray-750 p-4 rounded-lg shadow-inner w-full">
      <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end max-w-[85%] ${
              msg.sender === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
            }`}
          >
            <div
              className={`p-3 rounded-xl shadow ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-600 text-gray-200 rounded-bl-none'
              }`}
            >
              <div className="flex items-center mb-1">
                {msg.sender === 'ai' && <FaRobot className="mr-2 text-purple-300" />}
                {msg.sender === 'user' && <FaUser className="mr-2 text-blue-300" />}
                <span className="text-xs opacity-75">
                  {msg.sender === 'ai' ? 'AI Coach' : 'Du'} - {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length -1].sender === 'user' && (
          <div className="flex justify-start mr-auto">
            <div className="p-3 rounded-xl shadow bg-gray-600 text-gray-200 rounded-bl-none animate-pulse">
              <FaRobot className="mr-2 text-purple-300 inline" /> AI Coach tänker...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showFollowUpRecordButton && (
        <div className="mb-3 border-t border-gray-600 pt-3">
          <button
            onClick={onFollowUpRecord}
            disabled={isActuallyRecording || isChatProcessingAudio}
            className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg shadow-md flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
          >
            <FaMicrophoneAlt className="mr-2" /> 
            {isActuallyRecording ? 'Spelar in...' : (isChatProcessingAudio ? 'AI bearbetar...' : 'Gör ny inspelning')}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="flex items-center border-t border-gray-600 pt-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isLoading ? "Vänta på svar..." : "Skriv ditt meddelande..."}
          className="flex-grow p-3 bg-gray-600 border border-gray-500 rounded-l-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-100 disabled:opacity-60"
          disabled={isLoading}
          aria-label="Chattmeddelande"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center h-[3.25rem] w-[3.25rem]" 
          aria-label="Skicka meddelande"
        >
          {isLoading ? <AiOutlineLoading3Quarters className="animate-spin h-5 w-5" /> : <FaPaperPlane className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
