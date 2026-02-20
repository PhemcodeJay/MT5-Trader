import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TradingSignal } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface CurrentSignalProps {
  activeSignal: TradingSignal | null;
  isConnected: boolean;
}

export default function CurrentSignal({ activeSignal, isConnected }: CurrentSignalProps) {
  const { toast } = useToast();

  const handleExecuteSignal = async () => {
    if (!activeSignal) return;

    try {
      await apiRequest('POST', '/api/signals/execute');
      toast({
        title: "Signal Executed",
        description: `${activeSignal.side} signal executed successfully at ${activeSignal.entry}`,
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Failed to execute the trading signal",
        variant: "destructive",
      });
    }
  };

  if (!activeSignal) {
    return (
      <div className="bg-trading-card rounded-lg border border-trading-border">
        <div className="p-4 border-b border-trading-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Current Signal</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-trading-muted' : 'bg-trading-sell'}`} />
              <span className="text-xs text-trading-muted">
                {isConnected ? 'Waiting' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-trading-dark rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-trading-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-trading-muted mb-2">No active signal</p>
            <p className="text-sm text-trading-muted">Waiting for market conditions...</p>
          </div>
        </div>
      </div>
    );
  }

  const isBuy = activeSignal.side === 'Buy';
  const SignalIcon = isBuy ? ArrowUp : ArrowDown;
  const signalColor = isBuy ? 'trading-buy' : 'trading-sell';

  return (
    <div className="bg-trading-card rounded-lg border border-trading-border">
      <div className="p-4 border-b border-trading-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Current Signal</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-trading-buy rounded-full animate-pulse" />
            <span className="text-xs text-trading-muted">Live</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="text-center mb-4">
          <div className={`inline-flex items-center space-x-2 bg-${signalColor}/20 text-${signalColor} px-4 py-2 rounded-lg border border-${signalColor}/30`}>
            <SignalIcon className="h-4 w-4" />
            <span className="font-semibold">{activeSignal.side.toUpperCase()} SIGNAL</span>
          </div>
          <div className="text-sm text-trading-muted mt-1">{activeSignal.trend} Classification</div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Entry Price</span>
            <span className="font-mono font-medium">{activeSignal.entry.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Take Profit</span>
            <span className="font-mono font-medium text-trading-buy">{activeSignal.takeProfit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Stop Loss</span>
            <span className="font-mono font-medium text-trading-sell">{activeSignal.stopLoss.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Trail Stop</span>
            <span className="font-mono font-medium text-trading-warning">{activeSignal.trailStop.toFixed(2)}</span>
          </div>
          
          <hr className="border-trading-border" />
          
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Position Size</span>
            <span className="font-mono font-medium">{activeSignal.quantity.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Margin Required</span>
            <span className="font-mono font-medium text-trading-accent">${activeSignal.marginUsdt.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-trading-muted">Signal Score</span>
            <span className="font-mono font-medium text-trading-buy">{activeSignal.score.toFixed(1)}%</span>
          </div>
        </div>

        <Button 
          onClick={handleExecuteSignal}
          className={`w-full mt-4 bg-${signalColor} hover:bg-${signalColor}/80 text-trading-dark font-semibold py-2 px-4`}
        >
          Execute Trade
        </Button>
      </div>
    </div>
  );
}
