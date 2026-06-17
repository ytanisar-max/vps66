const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let currentProcess = null;

// Endpoint to fetch files (Basic File Manager)
app.get('/files', (req, res) => {
    fs.readdir(__dirname, (err, files) => {
        if (err) return res.status(500).send("Error reading directory");
        res.json(files);
    });
});

io.on('connection', (socket) => {
    console.log('User connected to panel');

    socket.on('start-server', (data) => {
        if (currentProcess) {
            socket.emit('log', 'A server is already running.\n');
            return;
        }
        
        socket.emit('log', 'Starting server on Port 6080...\n');
        
        // Example: Running a python script or a game server startup file
        // For a real game server, this could be: spawn('java', ['-jar', 'server.jar'])
        currentProcess = spawn('python3', ['-m', 'http.server', '6080']);

        currentProcess.stdout.on('data', (data) => {
            socket.emit('log', data.toString());
        });

        currentProcess.stderr.on('data', (data) => {
            socket.emit('log', data.toString());
        });

        currentProcess.on('close', (code) => {
            socket.emit('log', `\nServer stopped with code ${code}\n`);
            currentProcess = null;
        });
    });

    socket.on('stop-server', () => {
        if (currentProcess) {
            socket.emit('log', 'Stopping server...\n');
            currentProcess.kill();
            currentProcess = null;
        } else {
            socket.emit('log', 'No server is running.\n');
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Panel running on port ${PORT}`);
});

