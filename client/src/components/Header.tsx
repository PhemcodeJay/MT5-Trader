import { useState, useEffect } from "react";
import { Settings, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isConnected: boolean;
  connectionError: string | null;
}

export default function Header({ isConnected, connectionError }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [accountBalance] = useState(100.00);
  const [riskPercent] = useState(1.5);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substr(0, 19) + ' UTC');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-trading-darker border-b border-trading-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <ChartLine className="text-trading-accent text-xl h-6 w-6" />
          <h1 className="text-xl font-semibold text-trading-text">MT5 Trading Dashboard</h1>
        </div>
        
        <div className="hidden md:flex items-center space-x-2 bg-trading-card px-3 py-1 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-trading-buy animate-pulse' : 'bg-trading-sell'}`} />
          <span className="text-sm text-trading-muted">
            {isConnected ? 'Connected to MT5' : connectionError || 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-sm text-trading-muted font-mono">
          {currentTime}
        </div>
        
        <div className="hidden md:flex items-center space-x-4 bg-trading-card px-4 py-2 rounded-lg">
          <div className="text-sm">
            <span className="text-trading-muted">Balance:</span>
            <span className="font-mono font-medium ml-1">${accountBalance.toFixed(2)}</span>
          </div>
          <div className="text-sm">
            <span className="text-trading-muted">Risk:</span>
            <span className="font-mono font-medium text-trading-warning ml-1">{riskPercent}%</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-trading-card text-trading-muted hover:text-trading-text"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
