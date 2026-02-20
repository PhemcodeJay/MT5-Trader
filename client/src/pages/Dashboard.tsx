import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ChartPanel from "@/components/ChartPanel";
import CurrentSignal from "@/components/CurrentSignal";
import RiskManagement from "@/components/RiskManagement";
import SignalHistory from "@/components/SignalHistory";
import MobileNav from "@/components/MobileNav";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("H1");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  const { signals, activeSignal, indicators, isConnected, connectionError } = useWebSocket();

  return (
    <div className="min-h-screen bg-trading-dark text-trading-text font-trading antialiased overflow-x-hidden">
      <Header 
        isConnected={isConnected} 
        connectionError={connectionError}
      />
      
      <div className="flex h-screen">
        <Sidebar 
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          indicators={indicators}
          className="hidden lg:block"
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
            <div className="lg:col-span-2 space-y-4">
              <ChartPanel 
                timeframe={selectedTimeframe}
                indicators={indicators}
                activeSignal={activeSignal}
              />
            </div>
            
            <div className="space-y-4">
              <CurrentSignal 
                activeSignal={activeSignal}
                isConnected={isConnected}
              />
              
              <RiskManagement />
              
              <SignalHistory 
                signals={signals}
              />
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav 
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setSelectedTimeframe}
        isOpen={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
      />
    </div>
  );
}
