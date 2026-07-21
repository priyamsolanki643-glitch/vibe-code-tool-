const { Hono } = require('hono');
const { streamSSE } = require('hono/streaming');
const { serve } = require('@hono/node-server');

const app = new Hono();
app.get('/stream', (c) => {
  return streamSSE(c, async (stream) => {
    const text = "Arre bhai";
    const words = text.split(/(\s+)/);
    for (const word of words) {
      if (word) {
        await stream.writeSSE({ data: JSON.stringify({ type: 'text', text: word }) });
      }
    }
  });
});

const server = serve({ fetch: app.fetch, port: 8081 }, () => {
  fetch('http://localhost:8081/stream')
    .then(r => r.text())
    .then(text => {
      console.log("RESPONSE:", JSON.stringify(text));
      server.close();
    });
});
