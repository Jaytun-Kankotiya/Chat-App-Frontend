
const MessageList = ({ messages, user }) => {

  const sentTime = (messg) => {
    const sendDate = messg.createdAt;
    const time = new Date(sendDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return time;
  };
  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div
          key={index}
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
            <span className="message-time">{sentTime(msg) || ''}</span>
            {msg.sender === user.username && (
              <span className="message-status">
                {msg.status === "sent" && "✔"}
                {msg.status === "delivered" && "✔✔"}
                {msg.status === "seen" && (
                  <span style={{ color: "blue" }}>✔✔</span>
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
