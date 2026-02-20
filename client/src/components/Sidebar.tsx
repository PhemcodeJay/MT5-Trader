import { cn } from "@/lib/utils";
import { TechnicalIndicator } from "@shared/schema";

interface SidebarProps {
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  indicators: TechnicalIndicator | null;
  className?: string;
}

const timeframes = [
  { key: "M15", label: "M15 (15 Min)" },
  { key: "H1", label: "H1 (1 Hour)" },
  { key: "H4", label: "H4 (4 Hours)" },
];

export default function Sidebar({ selectedTimeframe, onTimeframeChange, indicators, className }: SidebarProps) {
  const currentPrice = indicators?.price || 2045.67;
  const priceChange = 12.34; // This would be calculated from price history

  return (
    <aside className={cn("w-64 bg-trading-darker border-r border-trading-border p-4", className)}>
      {/* Symbol Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-trading-muted mb-3 uppercase tracking-wider">
          Active Symbol
        </h3>
        <div className="bg-trading-card rounded-lg p-3 border border-trading-accent/20">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-semibold text-lg">XAUUSD</span>
            <span className="text-xs text-trading-muted">GOLD/USD</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xl font-bold">
              {currentPrice.toFixed(2)}
            </span>
            <span className="text-trading-buy text-sm font-mono">
              +{priceChange.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeframes */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-trading-muted mb-3 uppercase tracking-wider">
          Timeframes
        </h3>
        <div className="space-y-1">
          {timeframes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onTimeframeChange(key)}
              className={cn(
                "w-full text-left px-3 py-2 rounded transition-colors",
                selectedTimeframe === key
                  ? "bg-trading-accent/20 text-trading-accent font-medium"
                  : "hover:bg-trading-card text-trading-muted hover:text-trading-text"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-trading-muted mb-3 uppercase tracking-wider">
          Today's Stats
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-trading-muted">Signals Generated</span>
            <span className="font-mono font-medium">7</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-trading-muted">Profitable</span>
            <span className="font-mono font-medium text-trading-buy">5</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-trading-muted">Win Rate</span>
            <span className="font-mono font-medium text-trading-buy">71.4%</span>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div>
        <h3 className="text-sm font-medium text-trading-muted mb-3 uppercase tracking-wider">
          Recent Alerts
        </h3>
        <div className="space-y-2">
          <div className="bg-trading-card rounded p-2 border-l-2 border-trading-buy">
            <div className="text-xs text-trading-buy font-medium">BUY SIGNAL</div>
            <div className="text-xs text-trading-muted">2 minutes ago</div>
          </div>
          <div className="bg-trading-card rounded p-2 border-l-2 border-trading-sell">
            <div className="text-xs text-trading-sell font-medium">SELL SIGNAL</div>
            <div className="text-xs text-trading-muted">15 minutes ago</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
