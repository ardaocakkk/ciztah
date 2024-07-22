
import { useState, useEffect, useRef } from "react";
import useWebSocket from 'react-use-websocket';

function App() {
  const [guess, setGuess] = useState('');
  const [chatMessage, setChatMessage] = useState('')
  const canvasRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(10);
  const [word, setWord] = useState("")
  const [clientId] = useState(() => Math.random().toString(36).substring(7));
  const [guessedCorrect, setGuessCorrect] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const { sendMessage, lastMessage } = useWebSocket(`ws://localhost:8000/ws/${clientId}`);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'initial' || data.type === 'active_artist') {
        setGuessCorrect(false);
        clearCanvasFromServer();
        setActiveDrawer(data['active_artist'])
        setWord(data["word"])

      } else {
        if (data.type === 'draw') {
          drawFromServer(data);
        } else if (data.type === 'guess') {
          console.log(data)
          var messages = document.getElementById('messages')
          var message = document.createElement('li')
          var content = document.createTextNode(`${data.sender} : ${data.message}`);
          message.appendChild(content)
          messages.appendChild(message)
        }
        else if (data.type === 'chat') {
          var sender = data.sender ? data.sender : "SERVER";
          var chatMessages = document.getElementById('chatMessages')
          var chatMessage = document.createElement('li')
          var chatContent = document.createTextNode(`${sender} : ${data.message}`);
          chatMessage.appendChild(chatContent)
          chatMessages.appendChild(chatMessage)
        }
      }
      if (data.type === 'active_users') {
        setActiveUsers(data['active_users'])
      }
      if (data.type === "clear") {
        clearCanvasFromServer();
      }
      if (data.type === 'correct_guess') {
        console.log("type correct guess", data)
        data["guessers"].map((guesser) => {
          if (guesser === clientId) {
            setGuessCorrect(true)
            console.log(`${clientId} guessed correct`)
          }
        })
        messages = document.getElementById('messages')
        message = document.createElement('li')
        content = document.createTextNode(`${data.guesser} guessed correct`);
        message.appendChild(content)
        messages.appendChild(message)

      }
    }
  }, [lastMessage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.canvas.width = document.getElementById('canvas-div').offsetWidth;
    ctx.canvas.height = document.getElementById('canvas-div').offsetHeight;
    setCanvasCtx(ctx);
  }, [canvasRef]);

  const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  };

  const setPosition = (e) => {
    const pos = getMousePos(canvasRef.current, e);
    setMousePosition({ x: pos.x, y: pos.y });
  };

  const draw = (e) => {
    if (activeDrawer !== null && activeDrawer === clientId) {

      if (e.buttons !== 1) return;

      const ctx = canvasCtx;
      ctx.beginPath();
      ctx.moveTo(mousePosition.x, mousePosition.y);
      const pos = getMousePos(canvasRef.current, e);
      setMousePosition({ x: pos.x, y: pos.y });
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      const message = JSON.stringify({
        type: 'draw',
        drawer: clientId,
        prevX: mousePosition.x,
        prevY: mousePosition.y,
        x: pos.x,
        y: pos.y,
        color,
        lineWidth
      });
      sendMessage(message);
    }
  };


   const drawFromServer = (data) => {
    const ctx = canvasCtx;
    ctx.beginPath();
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const clearCanvas = () => {
    const ctx = canvasCtx;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const message = JSON.stringify({
      type: "clear"
    })
    sendMessage(message)
  };

  const clearCanvasFromServer = () => {
    const ctx = canvasCtx;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }


  return (
    <div className="App">
      <div className="'w-[964px] h-[599px] mx-auto justify-center my-[56px] flex" >
        <div className="w-[144px] h-[599px] border-2 rounded-lg">
          {activeUsers.map((user) => {
            return (
              <>
                <div className="w-[130px] h-[61px] border-2 mx-auto mt-[10px] flex ">
                  <div className="w-[37px] h-[37px] rounded-full border-2 ml-3 mt-2"></div>
                  <div className="w-[65px] h-[34px] items-center justify-center m-auto ">
                    <div>{user}</div>
                  </div>
                </div>
              </>
            )
          })}

        </div>
        <div className="w-[676px] h-[599px] ml-[143px]  ">
          <div className="relative">
            <div className=" w-full p-2 bg-white bg-opacity-50 flex justify-around items-center">
              {clientId === activeDrawer && (
                <>
                  <div>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="m-2"
                    />
                    <input
                      type="range"
                      value={lineWidth}
                      max={40}
                      onChange={(e) => setLineWidth(e.target.value)}
                      className="m-2"
                    />
                    <button
                      onClick={() => { clearCanvas() }}
                      className="m-2 p-2 bg-red-500 text-white rounded"
                    >
                      Clear
                    </button>
                    <button
                      className="m-2 p-2 bg-gray-500 text-white rounded"
                      onClick={() => { setColor("#FFFFFF"); }}
                    >
                      Eraser
                    </button>
                    <div className="w-full mx-auto jusify-center flex">
                      <p>You're drawing {word}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div id="canvas-div" className="relative w-[675px] h-[415px] border-2 rounded-lg">
            <canvas
              ref={canvasRef}
              onMouseEnter={(e) => setPosition(e)}
              onMouseMove={(e) => draw(e)}
              onMouseDown={(e) => setPosition(e)}
              className="w-full h-full"
            />
          </div>
           <div className="w-[676px] h-[168px] grid grid-cols-2 mt-[16px]">
            <div className="w-[338px] h-[168px] border-2 rounded-lg flex flex-col">
              <div id="messages" className="flex-1 p-2 overflow-y-auto ">
              </div>
              {(activeDrawer !== clientId && guessedCorrect !== true) && (
                <div className="flex p-2 border-t">
                  <form action="" onSubmit={(event) => {
                    var input = document.getElementById('messageText')
                    const message = JSON.stringify({
                      type: 'guess',
                      sender: clientId,
                      message: input.value,
                    });
                    sendMessage(message)
                    setGuess("")
                    event.preventDefault();
                  }}>
                    <input
                      type="text"
                      value={guess}
                      id="messageText"
                      onChange={(e) => setGuess(e.target.value)}
                      className="flex-1 p-2 border rounded mr-2"
                      placeholder="Make a guess"
                    />
                    <button
                      className="p-2 bg-blue-500 text-white rounded"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

            </div>
            <div className="w-[338px] h-[168px] border-2 rounded-lg flex flex-col">
              <div id="chatMessages" className="flex-1 p-2 overflow-y-auto auto-scroll">
              </div>
              <div className="flex p-2 border-t w-full">
                <form action="" onSubmit={(event) => {
                  var input = document.getElementById('messageText2')
                  const message = JSON.stringify({
                    type: 'chat',
                    sender: clientId,
                    message: input.value,
                  });
                  sendMessage(message)
                  setChatMessage("")
                  event.preventDefault();
                }}>
                  <div className="  ">
                    <input
                      type="text"
                      value={chatMessage}
                      id="messageText2"
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 p-2 border rounded mr-2"
                      placeholder="Type a message"
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
