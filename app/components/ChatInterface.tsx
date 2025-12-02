"use client";

import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { TextPart, TextStreamChatTransport } from "ai";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // Helper function to extract text content from message parts
  const getMessageText = (message: (typeof messages)[0]) =>
    message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as TextPart).text)
      .join("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput(""); // Clear input immediately

    await sendMessage({ text: currentInput });
  };

  const handleExampleClick = async (example: string) => {
    if (isLoading) return;
    setInput(example);
    await sendMessage({ text: example });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Ask About Your Cards
      </h2>

      {/* Chat Messages */}
      <div
        ref={messagesContainerRef}
        className="mb-6 h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p>Start a conversation about your cards</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  <p className="text-sm font-semibold mb-1">
                    {message.role === "user" ? "You" : "Assistant"}
                  </p>
                  <MarkdownMessage text={getMessageText(message)} />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-white text-gray-800 border border-gray-200">
                  <p className="text-sm font-semibold mb-1">Assistant</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your cards..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
        >
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </form>

      {/* Example Queries */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-2">Try these examples:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Show me all Michael Jordan cards",
            "What's my highest graded card?",
            "Find 2003 LeBron James rookies",
            "List all PSA 10 cards",
          ].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1">
        {listItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^\s*[\*\-]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    // Blank line ends current list
    if (line.trim() === "") {
      flushList();
      return;
    }

    flushList();
    elements.push(
      <p key={`paragraph-${idx}`} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  flushList();

  if (elements.length === 0) {
    return <p className="leading-relaxed">{renderInline(text)}</p>;
  }

  return <div className="space-y-2 text-sm">{elements}</div>;
}

function renderInline(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter((segment) => segment);

  return segments.map((segment, idx) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <span key={idx}>{segment}</span>;
  });
}
