try {
  console.log(JSON.parse('{"type":"text"}\r'));
} catch(e) {
  console.log('Error:', e.message);
}
