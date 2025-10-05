import React, { useState } from "react";
import axios from "axios";

const Login = ({ setUser }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const backendUrl = process.env.REACT_APP_SERVER_URL;

  const handleLogin = async () => {
    try {
      const { data } = await axios.post(`${backendUrl}/auth/login`, {
        username,
        password,
      });
      setUser(data);
    } catch (error) {
      console.error(error.response?.data?.message || "Error logging in");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="card py-5 text-center">
      <div className="card-body px-5">
        <h2>Login</h2>
        <p>Login with your credentials to continue.</p>
        <input
          type="text"
          placeholder="Username"
          value={username}
          className="form-control form-control-lg mt-3"
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          className="form-control form-control-lg mt-3"
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
        />

        <button className="btn btn-success btn-lg mt-3" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;
