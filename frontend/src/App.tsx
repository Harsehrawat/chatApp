import { useEffect, useRef, useState } from "react";
import "./App.css";

const generateRoomId = () => Math.random().toString(36).substring(2, 8);

function App() {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [typingStatus, setTypingStatus] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasSentTyping = useRef(false);

  useEffect(() => {
    if (!joined) return;

    const ws = new WebSocket("wss://chatapp-kzfk.onrender.com");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          payload: { roomId, username },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "chat") {
          setMessages((prev) => [...prev, data.payload.message]);
        }

        if (data.type === "user-list") {
          setUsers(data.payload.users);
        }

        if (data.type === "system") {
          setMessages((prev) => [...prev, `[System] ${data.payload.message}`]);
        }

        if (data.type === "typing") {
          if (data.payload.username !== username) {
            setTypingStatus(`${data.payload.username} is typing...`);
          }
        }

        if (data.type === "stop-typing") {
          if (data.payload.username !== username) {
            setTypingStatus(null);
          }
        }
      } catch (err) {
        setMessages((prev) => [...prev, event.data]);
      }
    };

    return () => {
      ws.close();
    };
  }, [joined, roomId, username]);

  const sendMessage = () => {
    const message = inputRef.current?.value;
    if (message && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat",
          payload: { message },
        })
      );
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const sendTyping = () => {
    if (!hasSentTyping.current && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          payload: { username },
        })
      );
      hasSentTyping.current = true;
    }
  };

  if (!joined) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-100">
        {!mode && (
          <>
            <h1 className="text-2xl font-bold mb-4">Welcome to Chat App</h1>
            <button
              onClick={() => {
                const newRoom = generateRoomId();
                setRoomId(newRoom);
                setMode("create");
              }}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >
              Join Room
            </button>
          </>
        )}

        {(mode === "create" || mode === "join") && (
          <div className="w-80 p-6 bg-white shadow rounded">
            <h2 className="text-lg font-semibold mb-3">
              {mode === "create" ? "Create Room" : "Join Room"}
            </h2>
            {mode === "join" && (
              <input
                className="w-full border p-2 mb-2"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            )}
            <input
              className="w-full border p-2 mb-2"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button
              onClick={() => setJoined(true)}
              className="bg-purple-600 text-white w-full py-2 rounded"
              disabled={!username || !roomId}
            >
              Join Chat
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <div className="flex justify-between p-4 bg-gray-900">
        <div>
          <strong>Room:</strong> {roomId}
        </div>
        <div>
          <strong>You:</strong> {username}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 bg-gray-800 p-4 overflow-y-auto">
          <h3 className="text-lg mb-2">Users</h3>
          <ul>
            {users.map((u) => (
              <li key={u} className="mb-1">
                • {u}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-4 overflow-y-auto h-full">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2">
              <span className="bg-white text-black px-4 py-2 rounded">
                {msg}
              </span>
            </div>
          ))}
          {typingStatus && (
            <div className="italic text-gray-400 mt-2">{typingStatus}</div>
          )}
        </div>
      </div>

      <div className="flex bg-white text-black p-4">
        <input
          ref={inputRef}
          className="flex-1 border px-4 py-2"
          placeholder="Type a message"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
              hasSentTyping.current = false;
              if (wsRef.current) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "stop-typing",
                    payload: { username },
                  })
                );
              }
            } else {
              sendTyping();
            }
          }}
          onFocus={sendTyping}
          onBlur={() => {
            hasSentTyping.current = false;
            if (wsRef.current) {
              wsRef.current.send(
                JSON.stringify({
                  type: "stop-typing",
                  payload: { username },
                })
              );
            }
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-purple-600 text-white px-4 py-2 ml-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
