import React, { useState, useEffect, useRef } from "react";

const MessageList = ({ messages, user }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sentTime = (messg) => {
    if (!messg.createdAt) return "";
    
    try {
      const sendDate = messg.createdAt;
      const time = new Date(sendDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return time;
    } catch (error) {
      console.error("Error parsing date:", error);
      return "";
    }
  };

  return (
    <div className="message-list">
      {messages?.map((msg, index) => (
        <div
          key={msg._id || index}
          className={`message-bubble ${
            msg.sender === user.username ? "sent" : "received"
          }`}>

          <div className="message-text">
            <strong>{msg.sender}: </strong>
            {msg.message}
          </div>

          <div
            className={`message-meta ${
              msg.sender === user.username ? "meta-right" : "meta-left"
            }`}>
            <span className="message-time">{sentTime(msg)}</span>
            {msg.sender === user.username && (
              <span className="message-status">
                {msg.status === "sending" && "⏱"}
                {msg.status === "sent" && "✓"}
                {msg.status === "delivered" && "✓✓"}
                {msg.status === "seen" && (
                  <span style={{ color: "blue" }}>✓✓</span>
                )}
              </span>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;