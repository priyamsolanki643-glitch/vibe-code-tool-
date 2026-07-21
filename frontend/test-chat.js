async function test() {
  const res = await fetch('http://localhost:8080/api/v1/oracle/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test', 'X-Anonymous-Id': '123' },
    body: JSON.stringify({
      message: 'Hello!',
      conversationHistory: [],
      contextMatrix: {},
      frictionProfile: {},
      strategyState: {}
    })
  });
  const text = await res.text();
  console.log(text.substring(0, 500));
}
test();
