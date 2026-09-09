import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { attachSocket } from "./sockets/socket";
import { isLLMConfigured, providerName } from "./services/groq";
import { isSupabaseConfigured } from "./data/supabaseClient";

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

  if (isSupabaseConfigured()) {
    console.log("Storage: Supabase");
  } else {
    console.warn(
      "\n⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. All ticket/ledger/incident\n" +
        "   requests will fail until you add them. Run supabase/schema.sql in your Supabase\n" +
        "   project's SQL Editor, then put the URL and service_role key in server/.env\n"
    );
  }
});