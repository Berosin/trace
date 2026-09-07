import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Tickets } from "./pages/Tickets";
import { TicketDetails } from "./pages/TicketDetails";
import { Incidents } from "./pages/Incidents";
import { Ledger } from "./pages/Ledger";
import { StoreProvider } from "./hooks/StoreContext";
import { IntroScreen } from "./components/IntroScreen";

export default function App() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <StoreProvider>
      {!introDone && <IntroScreen onComplete={() => setIntroDone(true)} />}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetails />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/ledger" element={<Ledger />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}