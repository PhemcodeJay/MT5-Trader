import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RiskManagement() {
  const [riskPercent, setRiskPercent] = useState([1.5]);
  const [leverage, setLeverage] = useState("20");

  const maxRisk = (riskPercent[0] / 100 * 100).toFixed(2); // Risk amount from $100 balance
  const rrRatio = "1:2.1"; // Risk-reward ratio

  return (
    <div className="bg-trading-card rounded-lg border border-trading-border">
      <div className="p-4 border-b border-trading-border">
        <h3 className="font-semibold">Risk Management</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm text-trading-muted mb-2">Risk per Trade (%)</label>
          <Slider
            value={riskPercent}
            onValueChange={setRiskPercent}
            max={5}
            min={0.5}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-trading-muted mt-1">
            <span>0.5%</span>
            <span className="text-trading-accent font-medium">{riskPercent[0]}%</span>
            <span>5.0%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-trading-muted mb-2">Leverage</label>
          <Select value={leverage} onValueChange={setLeverage}>
            <SelectTrigger className="w-full bg-trading-dark border-trading-border text-trading-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-trading-dark border-trading-border">
              <SelectItem value="10" className="text-trading-text hover:bg-trading-card">1:10</SelectItem>
              <SelectItem value="20" className="text-trading-text hover:bg-trading-card">1:20</SelectItem>
              <SelectItem value="50" className="text-trading-text hover:bg-trading-card">1:50</SelectItem>
              <SelectItem value="100" className="text-trading-text hover:bg-trading-card">1:100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-trading-dark rounded-lg p-3">
          <div className="text-xs text-trading-muted mb-2">Risk Analysis</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-trading-muted">Max Risk</div>
              <div className="font-mono font-medium">${maxRisk}</div>
            </div>
            <div>
              <div className="text-trading-muted">R:R Ratio</div>
              <div className="font-mono font-medium text-trading-buy">{rrRatio}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
