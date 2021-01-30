const server = require('http').createServer((request, response) => {
    response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET'
    });
    response.end('Hey there!');
});

const socketIO = require('socket.io');
const io = socketIO(server, {
    cors: {
        origin: '*',
        credentials: false
    }
});

io.on('connection', socket => {
    console.log('connection', socket.id);
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-connected', userId);
        socket.on('disconnect', () => {
            console.log('disconnected', roomId, userId);
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
        });
    });
});

const startServer = () => {
    const { address, port } = server.address();
    console.log(`app running at ${address}:${port}`);
};

server.listen(process.env.PORT || 3000, startServer);