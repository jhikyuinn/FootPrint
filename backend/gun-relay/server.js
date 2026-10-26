const http = require('http');
const Gun = require('gun');

const port = process.env.PORT || 8765;
const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('FootPrint gun relay\n');
});

Gun({ web: server.listen(port), peers });

console.log('Relay peer started on port ' + port + ' with /gun');
