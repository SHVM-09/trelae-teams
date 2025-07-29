// src/lib/socket/server.ts
import { Server } from 'socket.io';

let io: Server | null = null;

export function _setupSocket(server: any) {
	if (io) return io;
	io = new Server(server, {
		cors: {
			origin: '*',
		},
	});
	io.on('connection', (socket) => {
		console.log('Socket connected:', socket.id);

		socket.on('join', (room: string) => {
			socket.join(room);
			console.log(`Socket ${socket.id} joined room: ${room}`);
		});

		socket.on('message', ({ room, message, user }) => {
			io?.to(room).emit('message', { message, user });
		});

		socket.on('disconnect', () => {
			console.log('Socket disconnected:', socket.id);
		});
	});
	return io;
}