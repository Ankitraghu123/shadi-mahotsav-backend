const { Server } = require('socket.io');
const onlineUsers = require('../middlewares/OnlineUsers');

const initSocketIo = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('A user connected');

        // Store the user's ID and socket ID
        socket.on('setUserId', (userId) => {
            onlineUsers[userId] = socket.id;
            console.log(`User ID ${userId} connected with socket ID ${socket.id}`);
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            // Remove the user from the online users store
            for (const [userId, socketId] of Object.entries(onlineUsers)) {
                if (socketId === socket.id) {
                    delete onlineUsers[userId];
                    console.log(`User ID ${userId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
};

module.exports = initSocketIo;
