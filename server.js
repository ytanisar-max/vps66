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
app.use(express.json());

// Set your volume directory here (e.g., '/app/server-files' for Railway)
const WORK_DIR = path.join(__dirname, 'server-files');
if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR);
}

let currentProcess = null;

// --- FILE MANAGER API ---
app.get('/api/files', (req, res) => {
    fs.readdir(WORK_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: "Error reading directory" });
        res.json(files);
    });
});

app.post('/api/file/read', (req, res) => {
    const filePath = path.join(WORK_DIR, req.body.filename);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Error reading file" });
        res.json({ content: data });
    });
});

app.post('/api/file/write', (req, res) => {
    const filePath = path.join(WORK_DIR, req.body.filename);
    fs.writeFile(filePath, req.body.content, 'utf8', (err) => {
        if (err) return res.status(500).json({ error: "Error saving file" });
        res.json({ success: true });
    });
});

// --- SOCKET.IO FOR CONSOLE & SERVER MANAGEMENT ---
io.on('connection', (socket) => {
    console.log('Admin connected to panel');

    socket.on('start-server', (config) => {
        if (currentProcess) {
            socket.emit('log', '> Error: A server is already running.\n');
            return;
        }

        socket.emit('log', `> Starting server using: ${config.language}...\n`);
        
        let cmd = '';
        let args = [];

        // Logic for Language Selector
        if (config.language === 'java') {
            cmd = 'java';
            args = ['-Xmx' + config.ram, '-jar', config.file];
        } else if (config.language === 'node') {
            cmd = 'node';
            args = [config.file];
        } else if (config.language === 'python') {
            cmd = 'python3';
            args = [config.file];
        }

        try {
            currentProcess = spawn(cmd, args, { cwd: WORK_DIR });

            currentProcess.stdout.on('data', (data) => {
                socket.emit('log', data.toString());
            });

            currentProcess.stderr.on('data', (data) => {
                socket.emit('log', data.toString());
            });

            currentProcess.on('close', (code) => {
                socket.emit('log', `\n> Server stopped with code ${code}\n`);
                currentProcess = null;
            });
        } catch (error) {
            socket.emit('log', `> Failed to start: ${error.message}\n`);
        }
    });

    socket.on('stop-server', () => {
        if (currentProcess) {
            socket.emit('log', '> Force stopping server...\n');
            currentProcess.kill();
            currentProcess = null;
        } else {
            socket.emit('log', '> No server is currently running.\n');
        }
    });

    // Send command to the running server console
    socket.on('send-command', (cmd) => {
        if (currentProcess && currentProcess.stdin) {
            socket.emit('log', `> ${cmd}\n`);
            currentProcess.stdin.write(cmd + '\n');
        } else {
            socket.emit('log', '> Cannot send command. Server is not running.\n');
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Panel running on port ${PORT}`);
});
