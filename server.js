const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomCode) => {
        socket.join(roomCode);
        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: {}, bullets: [], powerups: [] };
            // Spawn a powerup every 5 seconds
            setInterval(() => spawnPowerup(roomCode), 5000);
        }
        
        rooms[roomCode].players[socket.id] = {
            x: 200, y: 200, angle: 0, score: 0, 
            color: `hsl(${Math.random() * 360}, 80%, 60%)`,
            health: 100
        };

        socket.emit('init', socket.id);

        socket.on('update', (data) => {
            if (rooms[roomCode].players[socket.id]) {
                Object.assign(rooms[roomCode].players[socket.id], data);
            }
        });

        socket.on('shoot', (bullet) => {
            if (rooms[roomCode]) rooms[roomCode].bullets.push(bullet);
        });

        socket.on('disconnect', () => {
            if (rooms[roomCode]) delete rooms[roomCode].players[socket.id];
        });
    });
});

function spawnPowerup(code) {
    if (rooms[code]) {
        rooms[code].powerups.push({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            id: Math.random()
        });
    }
}

// Game Logic Loop
setInterval(() => {
    for (let code in rooms) {
        let room = rooms[code];
        // Move bullets
        room.bullets.forEach((b, i) => {
            b.x += Math.cos(b.angle) * 8;
            b.y += Math.sin(b.angle) * 8;
            if(b.x < 0 || b.x > 2000) room.bullets.splice(i, 1);
        });
        io.to(code).emit('gameState', room);
    }
}, 20);

http.listen(PORT, () => console.log('Server running on port ' + PORT));