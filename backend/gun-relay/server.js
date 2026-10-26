const http = require('http');
const Gun = require('gun');

const port = process.env.PORT || 8765;
const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('FootPrint gun relay\n');
});

// axe: false: with AXE on, this relay did not pass messages between the app's clients, so rooms only updated on re-entry
Gun({ web: server.listen(port), peers, axe: false });

console.log('Relay peer started on port ' + port + ' with /gun');
