import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { Smile } from "lucide-react";
import MessageList from "./MessageList";
import EmojiPicker from "emoji-picker-react";
import "./chat.css";

const socket = io("http://localhost:5001");

export const Chat = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);

  const backendUrl = process.env.REACT_APP_SERVER_URL;
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/users`, {
          params: { currentUser: user.username },
        });
        setUsers(data.data || []);
      } catch (error) {
        console.error("Error fetching users", error);
      }
    };
    fetchUsers();
  }, [backendUrl]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);

      if (data.receiver === user.username) {
        socket.emit("mark_delivered", {
          sender: data.sender,
          receiver: user.username,
        });
      }
    });

    socket.on("message_status", ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, status } : msg))
      );
    });

    socket.on("message_status_bulk", ({ sender: senderUser, status }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === senderUser && msg.receiver === user.username
            ? { ...msg, status }
            : msg
        )
      );
    });

    socket.on("typing_status", ({ sender, isTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [sender]: isTyping }));
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_status");
      socket.off("message_status_bulk");
      socket.off("typing_status");
    };
  }, [user.username]);

  const fetchMessages = async (receiver) => {
    try {
      const { data } = await axios.get(`${backendUrl}/messages`, {
        params: { sender: user.username, receiver },
      });
      setMessages(data.data);
      setCurrentChat(receiver);

      socket.emit("mark_delivered", {
        sender: receiver,
        receiver: user.username,
      });
    } catch (error) {
      console.error("Error fetching messages", error);
    }
  };

  const sendMessage = () => {
    if (!currentChat || !currentMessage.trim()) return;

    const messageData = {
      sender: user.username,
      receiver: currentChat,
      message: currentMessage,
    };

    setMessages((prev) => [...prev, { ...messageData, status: "sent" }]);
    setCurrentMessage("");

    socket.emit("send_message", messageData);

    // fetchMessages(currentChat);
  };

  useEffect(() => {
    if (currentChat) {
      socket.emit("mark_seen", {
        sender: currentChat,
        receiver: user.username,
      });
    }
  }, [currentChat, user.username]);

  const handleTyping = (e) => {
    const value = e.target.value;
    setCurrentMessage(value);
    setCurrentMessage(e.target.value);
    socket.emit("typing", {
      sender: user.username,
      receiver: currentChat,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        sender: user.username,
        receiver: currentChat,
        isTyping: false,
      });
    }, 1000);
  };

  const onEmojiClick = (emojiData, event) => {
    setCurrentMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <div>
      <h2>Welcome, {user.username}</h2>
      <div className="chat-container">
        <div className="chat-main">
          <div className="chat-list">
            {users.map((u) => (
              <div
                key={u._id}
                className={`chat-user ${
                  currentChat === u.username ? "active" : ""
                }`}
                onClick={() => fetchMessages(u.username)}>
                {u.username}{" "}
                {typingUsers[u.username] && (
                  <span className="typing">typing...</span>
                )}
              </div>
            ))}
          </div>

          <div className="chat-window">
            {currentChat && (
              <>
                <h5>You are chatting with {currentChat}</h5>
                <div className="message-list">
                  <MessageList messages={messages} user={user} />
                </div>

                <div className="message-field">
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={currentMessage}
                      onChange={handleTyping}
                    />
                    <button
                      type="button"
                      className="emoji-toggle-btn"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                      <Smile />
                    </button>
                    <button
                      type="button"
                      className="send-btn"
                      onClick={sendMessage}>
                      Send
                    </button>
                  </div>

                  {showEmojiPicker && (
                    <div className="emoji-container">
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
