import { useState, useEffect, useRef } from "react";
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
  const inputRef = useRef(null)

  useEffect(() => {
    if (user?.username) {
      socket.emit("join", user.username);
      console.log(`${user.username} joined their room`);
    }
  }, [user?.username]);


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
  }, [backendUrl, user.username]);

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      console.log("Received message:", data);

      setMessages((prev) => {
        if (!Array.isArray(prev)) return [data];
        return [...prev, data];
      });

      if (data.receiver === user.username) {
        socket.emit("mark_delivered", {
          sender: data.sender,
          receiver: user.username,
        });
      }
    };

    const handleMessageSentConfirmation = (data) => {
      console.log("Message sent confirmation:", data);
      setMessages((prev) => {
        if (!Array.isArray(prev)) return [data];
        return prev.map((msg) =>
          msg._id?.toString().startsWith("temp-") &&
          msg.sender === data.sender &&
          msg.receiver === data.receiver &&
          msg.message === data.message
            ? data
            : msg
        );
      });
    };

    const handleMessageStatus = ({ messageId, status }) => {
      console.log("Message status update:", messageId, status);
      setMessages((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((msg) =>
          msg._id === messageId ? { ...msg, status } : msg
        );
      });
    };

    const handleMessageStatusBulk = ({ sender: senderUser, status }) => {
      console.log("Bulk status update from:", senderUser, "status:", status);
      setMessages((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((msg) => {
          if (msg.sender === user.username && msg.receiver === senderUser) {
            const statusOrder = { sending: 0, sent: 1, delivered: 2, seen: 3 };
            const currentStatusLevel = statusOrder[msg.status] || 0;
            const newStatusLevel = statusOrder[status] || 0;

            if (newStatusLevel > currentStatusLevel) {
              console.log(
                `Updating message from ${msg.sender} to ${msg.receiver}: ${msg.status} -> ${status}`
              );
              return { ...msg, status };
            }
          }
          return msg;
        });
      });
    };

    const handleTypingStatus = ({ sender, isTyping }) => {
      console.log(
        `Typing status received: ${sender} is ${
          isTyping ? "typing" : "stopped typing"
        }`
      );
      setTypingUsers((prev) => ({ ...prev, [sender]: isTyping }));
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_sent_confirmation", handleMessageSentConfirmation);
    socket.on("message_status", handleMessageStatus);
    socket.on("message_status_bulk", handleMessageStatusBulk);
    socket.on("typing_status", handleTypingStatus);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_sent_confirmation", handleMessageSentConfirmation);
      socket.off("message_status", handleMessageStatus);
      socket.off("message_status_bulk", handleMessageStatusBulk);
      socket.off("typing_status", handleTypingStatus);
    };
  }, [user.username, currentChat]);

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

    const tempMessage = {
      ...messageData,
      status: "sending",
      createdAt: new Date().toISOString(),
      _id: `temp-${Date.now()}`,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setCurrentMessage("");
    setShowEmojiPicker(false);

    socket.emit("send_message", messageData);

    socket.emit("typing", {
      sender: user.username,
      receiver: currentChat,
      isTyping: false,
    });
  };

  useEffect(() => {
    if (currentChat) {
      socket.emit("mark_seen", {
        sender: currentChat,
        receiver: user.username,
      });
    }
  }, [currentChat, user.username, messages]);

  const handleTyping = (e) => {
    const value = e.target.value;
    setCurrentMessage(value);

    if (!currentChat) return;

    socket.emit("typing", {
      sender: user.username,
      receiver: currentChat,
      isTyping: value.length > 0,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          sender: user.username,
          receiver: currentChat,
          isTyping: false,
        });
      }, 2000);
    }
  };

  const onEmojiClick = (emojiData, event) => {
    setCurrentMessage((prev) => prev + emojiData.emoji);
    inputRef.current.focus()
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div>
      <h2>Welcome, {user?.username}</h2>
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
                  <span className="typing">is typing...</span>
                )}
              </div>
            ))}
          </div>

          <div className="chat-window">
            {currentChat && (
              <>
                <h5>
                  You are chatting with {currentChat}
                  {typingUsers[currentChat] && (
                    <span className="typing-indicator"> (typing...)</span>
                  )}
                </h5>
                <div className="message-list">
                  <MessageList messages={messages} user={user} />
                </div>

                <div className="message-field">
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={currentMessage}
                      ref={inputRef}
                      onChange={handleTyping}
                      onKeyPress={handleKeyPress}
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
