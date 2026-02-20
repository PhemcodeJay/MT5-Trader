import { Expand, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TechnicalIndicator, TradingSignal } from "@shared/schema";

interface ChartPanelProps {
  timeframe: string;
  indicators: TechnicalIndicator | null;
  activeSignal: TradingSignal | null;
}

export default function ChartPanel({ timeframe, indicators, activeSignal }: ChartPanelProps) {
  const rsi = indicators?.rsi || 67.34;
  const macd = indicators?.macd || 2.45;
  const ema21 = indicators?.ema21 || 2042.15;
  const atr = indicators?.atr || 15.67;

  const getRSIStatus = (value: number) => {
    if (value > 70) return { text: "Overbought", color: "text-trading-warning" };
    if (value < 30) return { text: "Oversold", color: "text-trading-buy" };
    return { text: "Normal", color: "text-trading-muted" };
  };

  const rsiStatus = getRSIStatus(rsi);

  return (
    <div className="bg-trading-card rounded-lg border border-trading-border">
      <div className="flex items-center justify-between p-4 border-b border-trading-border">
        <h2 className="font-semibold text-lg">XAUUSD Chart & Analysis</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 text-xs bg-trading-accent/20 text-trading-accent border-trading-accent/30 hover:bg-trading-accent/30"
          >
            <Expand className="h-3 w-3 mr-1" />
            Fullscreen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 text-xs bg-trading-border text-trading-muted hover:text-trading-text border-trading-border hover:bg-trading-border/80"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="p-4 h-96">
        <div className="w-full h-full bg-trading-darker rounded-lg flex items-center justify-center border-2 border-dashed border-trading-border">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-trading-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
            </svg>
            <p className="text-trading-muted font-medium mb-1">Interactive Candlestick Chart</p>
            <p className="text-sm text-trading-muted">Real-time XAUUSD price action with technical indicators</p>
            {activeSignal && (
              <div className="mt-4 p-2 bg-trading-card rounded border border-trading-accent/30">
                <p className="text-xs text-trading-accent">
                  Active {activeSignal.side} Signal at {activeSignal.entry}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="p-4 border-t border-trading-border">
        <h3 className="font-medium mb-3">Technical Indicators ({timeframe})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-trading-dark rounded-lg p-3">
            <div className="text-xs text-trading-muted mb-1">RSI (14)</div>
            <div className="font-mono font-semibold">{rsi.toFixed(2)}</div>
            <div className={`text-xs ${rsiStatus.color}`}>{rsiStatus.text}</div>
          </div>
          
          <div className="bg-trading-dark rounded-lg p-3">
            <div className="text-xs text-trading-muted mb-1">MACD</div>
            <div className={`font-mono font-semibold ${macd > 0 ? 'text-trading-buy' : 'text-trading-sell'}`}>
              {macd > 0 ? '+' : ''}{macd.toFixed(2)}
            </div>
            <div className={`text-xs ${macd > 0 ? 'text-trading-buy' : 'text-trading-sell'}`}>
              {macd > 0 ? 'Bullish' : 'Bearish'}
            </div>
          </div>
          
          <div className="bg-trading-dark rounded-lg p-3">
            <div className="text-xs text-trading-muted mb-1">EMA (21)</div>
            <div className="font-mono font-semibold">{ema21.toFixed(2)}</div>
            <div className="text-xs text-trading-accent">Above Price</div>
          </div>
          
          <div className="bg-trading-dark rounded-lg p-3">
            <div className="text-xs text-trading-muted mb-1">ATR (14)</div>
            <div className="font-mono font-semibold">{atr.toFixed(2)}</div>
            <div className="text-xs text-trading-muted">Volatility</div>
          </div>
        </div>
      </div>
    </div>
  );
}
