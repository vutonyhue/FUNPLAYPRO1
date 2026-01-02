import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor, isNative } from "./lib/capacitorInit";
import { initWeb3Modal } from "./lib/web3Config";

// Initialize Web3Modal EARLY for mobile wallet support
if (typeof window !== 'undefined') {
  initWeb3Modal();
  console.log('Web3Modal initialized for wallet connections');
}

// Initialize Capacitor for native app features
if (isNative) {
  initCapacitor().then(() => {
    console.log('Capacitor initialized for native platform');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
