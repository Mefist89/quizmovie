import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static('.'));

const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws) => {
  let roomId;
  let playerId;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'join':
        roomId = data.roomId;
        if (!rooms.has(roomId)) {
          rooms.set(roomId, { players: [], gameState: null });
        }
        
        const room = rooms.get(roomId);
        if (room.players.length >= 2) {
          ws.send(JSON.stringify({ type: 'error', message: 'Комната заполнена' }));
          return;
        }

        playerId = room.players.length + 1;
        room.players.push({ ws, playerId });
        clients.set(ws, { roomId, playerId });

        ws.send(JSON.stringify({ type: 'joined', playerId }));

        if (room.players.length === 2) {
          room.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'start' }));
          });
        }
        break;

      case 'choice':
        const currentRoom = rooms.get(roomId);
        if (!currentRoom) return;

        currentRoom.players.forEach(player => {
          player.ws.send(JSON.stringify({
            type: 'playerChoice',
            playerId: data.playerId,
            choice: data.choice
          }));
        });
        break;
    }
  });

  ws.on('close', () => {
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(player => player.ws !== ws);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        room.players.forEach(player => {
          player.ws.send(JSON.stringify({ type: 'playerLeft' }));
        });
      }
    }
    clients.delete(ws);
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});