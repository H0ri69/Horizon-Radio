import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:8080');

ws.on('open', function open() {
  console.log('connected successfully');
  ws.send(JSON.stringify({ type: 'TEST' }));
  ws.close();
});

ws.on('error', function error(err) {
  console.error('connection failed:', err);
});
