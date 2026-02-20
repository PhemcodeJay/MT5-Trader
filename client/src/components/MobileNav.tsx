import { BarChart3, Bell, Calculator, History } from "lucide-react";

interface MobileNavProps {
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileNav({ selectedTimeframe, onTimeframeChange, isOpen, onOpenChange }: MobileNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-trading-darker border-t border-trading-border p-2">
      <div className="flex justify-around">
        <button className="flex flex-col items-center space-y-1 px-3 py-2 text-trading-accent">
          <BarChart3 className="h-5 w-5" />
          <span className="text-xs">Charts</span>
        </button>
        <button className="flex flex-col items-center space-y-1 px-3 py-2 text-trading-muted">
          <Bell className="h-5 w-5" />
          <span className="text-xs">Signals</span>
        </button>
        <button className="flex flex-col items-center space-y-1 px-3 py-2 text-trading-muted">
          <Calculator className="h-5 w-5" />
          <span className="text-xs">Risk</span>
        </button>
        <button className="flex flex-col items-center space-y-1 px-3 py-2 text-trading-muted">
          <History className="h-5 w-5" />
          <span className="text-xs">History</span>
        </button>
      </div>
    </div>
  );
}
