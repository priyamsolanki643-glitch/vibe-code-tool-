let streamBuffer = "";
let accumulatedReply = "";

const chunks = [
  "data: {\"type\": \"text\", \"text\": \"Arre\"}\n\n",
  "data: {\"type\": \"text\", \"text\": \" bha\"}\n",
  "\ndata: {\"type\": \"text\", \"text\": \"i\"}\n\n"
];

for (const chunk of chunks) {
  streamBuffer += chunk;
  const lines = streamBuffer.split("\n");
  streamBuffer = lines.pop() || "";
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const dataStr = line.replace("data: ", "");
      if (dataStr === "[DONE]") {
        break;
      }
      try {
        const eventData = JSON.parse(dataStr);
        if (eventData.type === "text") {
          accumulatedReply += eventData.text;
        }
      } catch (e) {
        console.error("Parse error on:", dataStr, e);
      }
    }
  }
}
console.log("FINAL:", accumulatedReply);
