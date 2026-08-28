import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { attachSocket } from "./sockets/socket";
import { isLLMConfigured, providerName } from "./services/groq";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();
const httpServer = http.createServer(app);
attachSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`TRACE API listening on http://localhost:${PORT}`);
  if (isLLMConfigured()) {
    console.log(`LLM provider: ${providerName()}`);
  } else {
    console.warn(
      "\n⚠️  GROQ_API_KEY is not set. Agent actions will fail until you add one.\n" +
        "   Get a free key at https://console.groq.com/keys and put it in server/.env\n"
    );
  }
});
