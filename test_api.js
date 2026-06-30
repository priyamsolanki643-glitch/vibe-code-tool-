const http = require('http');

http.get('http://localhost:8080/api/v1/interaction/active-mission', {
  headers: {
    'X-Anonymous-Id': 'test-anon-id'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
}).on('error', (err) => console.log('Error:', err.message));
