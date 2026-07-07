async function test() {
  const res = await fetch('http://localhost:8080/api/v1/threads', {
    headers: { 'Authorization': 'Bearer test', 'X-Anonymous-Id': '123' }
  });
  const data = await res.json();
  console.log("Threads count:", data.data ? data.data.length : data);
  if(data.data && data.data.length > 0) {
    console.log("Latest thread:", data.data[0]);
  }
}
test();
