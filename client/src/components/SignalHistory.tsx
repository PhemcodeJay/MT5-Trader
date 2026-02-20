import { ArrowUp, ArrowDown } from "lucide-react";
import { TradingSignal } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface SignalHistoryProps {
  signals: TradingSignal[];
}

export default function SignalHistory({ signals }: SignalHistoryProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }) + ' UTC';
  };

  const formatPnL = (pnl: number | null) => {
    if (pnl === null || pnl === 0) return null;
    const sign = pnl > 0 ? '+' : '';
    return `${sign}$${pnl.toFixed(2)}`;
  };

  const getPnLColor = (pnl: number | null) => {
    if (!pnl || pnl === 0) return 'text-trading-muted';
    return pnl > 0 ? 'text-trading-buy' : 'text-trading-sell';
  };

  return (
    <div className="bg-trading-card rounded-lg border border-trading-border">
      <div className="p-4 border-b border-trading-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Signal History</h3>
          <Button
            variant="link"
            className="text-xs text-trading-accent hover:text-trading-accent/80 p-0 h-auto"
          >
            View All
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        {signals.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-trading-dark rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-trading-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-trading-muted text-sm">No signals yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {signals.slice(0, 5).map((signal) => {
              const isBuy = signal.side === 'Buy';
              const SignalIcon = isBuy ? ArrowUp : ArrowDown;
              const signalColor = isBuy ? 'trading-buy' : 'trading-sell';
              const pnlFormatted = formatPnL(signal.pnl);
              const pnlColor = getPnLColor(signal.pnl);

              return (
                <div 
                  key={signal.id} 
                  className="flex items-center justify-between py-2 border-b border-trading-border/30 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 bg-${signalColor}/20 rounded-full flex items-center justify-center`}>
                      <SignalIcon className={`text-xs text-${signalColor} h-3 w-3`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {signal.side.toUpperCase()} {signal.entry.toFixed(2)}
                      </div>
                      <div className="text-xs text-trading-muted">
                        {formatTime(signal.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono ${pnlColor}`}>
                      {pnlFormatted || (signal.status === 'active' ? 'Active' : 'Pending')}
                    </div>
                    <div className="text-xs text-trading-muted capitalize">
                      {signal.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
