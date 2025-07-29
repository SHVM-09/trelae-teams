import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './src/lib/server/db/schema';
import 'dotenv/config';

const app = express();
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  path: '/api/socket',
  cors: { origin: '*' }
});

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle(client, { schema });

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join', (room: string) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // If you allow direct socket emits (optional)
  socket.on('message', async ({ room, message, user, userId }: any) => {
    const createdAt = new Date();
    const toInsert  = { room, message, user, userId, createdAt };         // 👈 store userId
    await db.insert(schema.messages).values(toInsert);
    io.to(room).emit('message', { ...toInsert, createdAt: createdAt.toISOString() });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// REST endpoint SvelteKit calls
app.post('/api/chat/broadcast', async (req, res) => {
  try {
    const { room, message, user, userId } = req.body ?? {};
    if (!room || !message || !user) {
      return res.status(400).json({ ok: false, error: 'room, message, user required' });
    }
    const createdAt = new Date();
    const toInsert  = { room, message, user, userId, createdAt };         // 👈 store userId
    await db.insert(schema.messages).values(toInsert);
    io.to(room).emit('message', { ...toInsert, createdAt: createdAt.toISOString() });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'broadcast failed' });
  }
});

// Notifies all clients in a room that the chat was cleared
app.post('/api/chat/clear', async (req, res) => {
  const { room } = req.body ?? {};
  if (!room) return res.status(400).json({ ok: false, error: 'room required' });

  io.to(room).emit('chat:cleared');
  return res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.SOCKET_PORT ?? 3001);
server.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
  console.log(`Socket.IO path -> http://localhost:${PORT}/api/socket`);
});