import asyncio
import json
from collections import deque
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

# Allow CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

words = {
    "words": [
        "Cat",
        "Dog",
        "Sun",
        "Tree",
        "House",
        "Car",
        "Flower",
        "Fish",
        "Bird",
        "Apple",
        "Bicycle",
        "Elephant",
        "Mountain",
        "Spaceship",
        "Castle",
        "Unicorn",
        "Guitar",
        "Snowman",
        "Rainbow",
        "Pizza",
        "Rollercoaster",
        "Hot air balloon",
        "Lighthouse",
        "Dragon",
        "Chameleon",
        "Skyscraper",
        "Submarine",
        "Phoenix",
        "Stegosaurus",
        "Windmill",
        "Lion",
        "Train",
        "Planet",
        "Butterfly",
        "Hamburger",
        "Cake",
        "Shark",
        "Mermaid",
        "Knight",
        "Wizard",
        "Tractor",
        "Octopus",
        "Rocket",
        "Squirrel",
        "Dolphin",
        "Ice cream",
        "Kangaroo",
        "Helicopter",
        "Fox",
        "Tornado",
        "Beach",
        "Camera",
        "Dinosaur",
        "Panda",
        "Parrot",
        "Airplane",
        "Cactus",
        "Whale",
        "Skater",
        "Tennis racket",
        "Violin",
        "Robot",
        "Alien",
        "Jellyfish",
        "Crocodile",
        "Angel",
        "Palm tree",
        "Magician",
        "Ship",
        "Scarecrow",
        "Carousel",
        "Cowboy",
        "Castle",
        "Dragonfly",
        "Fairy",
        "Frog",
        "Genie",
        "Hedgehog",
        "King",
        "Ladder",
        "Ladybug",
        "Lighthouse",
        "Ninja",
        "Owl",
        "Pegasus",
        "Pirate",
        "Rainbow",
        "Robot",
        "Scorpion",
        "Snail",
        "Snowflake",
        "Spaceship",
        "Spider",
        "Squid",
        "Starfish",
        "Surfboard",
        "Swan",
        "Telescope",
        "Treasure chest",
        "Volcano"
    ]
}


class ConnectionManager:
    def __init__(self):
        self.active_connections: deque = deque()
        self.active_artist: str = ""
        self.loop = asyncio.get_event_loop()
        self.loop.create_task(self.periodic_handle_active_artist())
        self.word = ""
        self.correct_guessers = []

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections.append((websocket, client_id))
        if len(self.active_connections) == 1:
            self.generate_random_word()
            self.active_artist = client_id
        await websocket.send_text(json.dumps({"type": "initial",
                                              "active_artist": self.active_artist,
                                              "word": self.word}))
        for connection in self.active_connections:
            await connection[0].send_text(json.dumps(
                {"type": "active_users", "active_users": [connection[1] for connection in self.active_connections]}))

    async def disconnect(self, websocket: WebSocket, client_id: str):
        self.active_connections.remove((websocket, client_id))
        if self.active_artist == client_id:
            await self.handle_active_artist()

    async def broadcast(self, message: str, websocket: WebSocket):
        message_dict = json.loads(message)
        if message_dict["type"] == "draw":
            message_dict["active_artist"] = self.active_artist
            updated_message = json.dumps(message_dict)
            for connection in self.active_connections:
                if connection[0] != websocket:
                    await connection[0].send_text(updated_message)
        elif message_dict["type"] == "clear":
            for connection in self.active_connections:
                await connection[0].send_text(json.dumps({"type": "clear"}))
        elif message_dict["type"] == "guess":
            guess = str(message_dict['message'])
            if guess.lower() == self.word.lower():
                self.correct_guessers.append(message_dict["sender"])
                for connection in self.active_connections:
                    await connection[0].send_text(json.dumps({"type": "correct_guess", "guessers": self.correct_guessers, "guesser" : message_dict["sender"]}))
            else:
                for connection in self.active_connections:
                    message_dict["receiver"] = self.active_connections[self.active_connections.index(connection)][1]
                    await connection[0].send_text(message)
        elif message_dict["type"] == "chat":
            sentMessage = str(message_dict['message'])
            for connection in self.active_connections:
                message_dict["receiver"] = self.active_connections[self.active_connections.index(connection)][1]
                if sentMessage.lower().find(self.word.lower()) != -1:
                    await connection[0].send_text(json.dumps({"type": "chat", "message": "The word is in the message"}))
                else:
                    await connection[0].send_text(message)

    async def handle_active_artist(self):
        self.generate_random_word()
        self.correct_guessers = []
        if len(self.active_connections) > 1:
            self.active_connections.rotate(-1)
            self.active_artist = self.active_connections[0][1]
            for connection in self.active_connections:
                await connection[0].send_text(
                    json.dumps({"type": "active_artist",
                                "active_artist": self.active_artist,
                                "word": self.word}))
        elif len(self.active_connections) == 1:
            self.generate_random_word()
            self.active_artist = self.active_connections[0][1]
            await self.active_connections[0][0].send_text(
                json.dumps({"type": "active_artist",
                            "active_artist": self.active_artist,
                            "word": self.word}))

    async def periodic_handle_active_artist(self):
        while True:
            await asyncio.sleep(30)  # Wait for x seconds
            if self.active_connections:
                await self.handle_active_artist()

    def generate_random_word(self):
        self.word = random.choice(words["words"])


manager = ConnectionManager()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, websocket)
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        await manager.disconnect(websocket, client_id)

#
# if __name__ == "__main__":
#
#     uvicorn.run(app, host="0.0.0.0", port=8000)
