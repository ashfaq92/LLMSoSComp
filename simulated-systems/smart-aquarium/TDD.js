import http from 'http';

const PORT = 9101;

// In-memory TD registry (replace with a DB for production)
const things = [];

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/things') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ things }));
  } else if (req.method === 'POST' && req.url === '/things') {
    // Optional: allow dynamic registration
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const td = JSON.parse(body);
        things.push(td);
        console.log(`Device registered: ${td.title || td.deviceName || 'Unknown'}`);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'registered', td }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`TDD server running at http://localhost:${PORT}/things`);
});
