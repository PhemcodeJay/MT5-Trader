import { storage } from "../storage";
import { InsertTradingSignal, InsertTechnicalIndicator } from "@shared/schema";
import axios from "axios";

// Configuration constants
const SYMBOL = "XAUUSD";
const BTC_SYMBOL = "BTCUSD";
const RISK_PCT = 0.015;
const ACCOUNT_BALANCE = 100;
const LEVERAGE = 20;
const ENTRY_BUFFER_PCT = 0.002;
const MIN_VOLUME = 100; // Adjusted for real data
const MIN_ATR_PCT = 0.0001;
const RSI_ZONE = [10, 90] as const;

// Technical indicator calculations
export class MT5Analyzer {
  static async fetchRealPriceData(symbol: string): Promise<{ closes: number[], highs: number[], lows: number[], volumes: number[] }> {
    try {
      if (symbol === "BTCUSD") {
        const response = await axios.get("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly");
        const prices = response.data.prices.map((p: [number, number]) => p[1]);
        // For simple analysis, we'll use price as close, high, low and mock volume if not available
        return {
          closes: prices,
          highs: prices.map((p: number) => p * 1.002),
          lows: prices.map((p: number) => p * 0.998),
          volumes: new Array(prices.length).fill(2000)
        };
      } else {
        // Gold (XAUUSD) - Fallback to mock with slightly more realistic movement if no API key
        // In a real scenario, this would use GoldAPI.io with the provided key
        return this.generateMockPriceData(2045.67, 100);
      }
    } catch (error) {
      console.error(`Error fetching real data for ${symbol}:`, error);
      return this.generateMockPriceData(symbol === "BTCUSD" ? 65000 : 2045.67, 100);
    }
  }

  static ema(prices: number[], period: number): number | null {
    if (prices.length < period) return null;
    const mult = 2 / (period + 1);
    let val = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      val = (prices[i] - val) * mult + val;
    }
    return val;
  }

  static sma(prices: number[], period: number): number | null {
    if (prices.length < period) return null;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  static rsi(prices: number[], period: number = 14): number | null {
    if (prices.length < period + 1) return null;
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(Math.max(change, 0));
      losses.push(Math.max(-change, 0));
    }
    
    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
    const rs = avgGain / (avgLoss + 1e-10);
    
    return 100 - (100 / (1 + rs));
  }

  static bollinger(prices: number[], period: number = 20, sd: number = 2): [number | null, number | null, number | null] {
    const mid = this.sma(prices, period);
    if (mid === null) return [null, null, null];
    
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mid, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return [mid + sd * stdDev, mid, mid - sd * stdDev];
  }

  static atr(highs: number[], lows: number[], closes: number[], period: number = 14): number | null {
    if (highs.length < period + 1) return null;
    
    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
    
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }
    
    return atr;
  }

  static macd(prices: number[]): number | null {
    const fast = this.ema(prices, 12);
    const slow = this.ema(prices, 26);
    return fast && slow ? fast - slow : null;
  }

  static classifyTrend(ema9: number | null, ema21: number | null, sma20: number | null): string {
    if (!ema9 || !ema21 || !sma20) return "Scalp";
    
    if (ema9 > ema21 && ema21 > sma20) return "Trend";
    if (ema9 > ema21) return "Swing";
    return "Scalp";
  }

  // Generate mock price data for simulation
  static generateMockPriceData(basePrice: number = 2045.67, periods: number = 100): {
    closes: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
  } {
    const closes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const volumes: number[] = [];
    
    let currentPrice = basePrice;
    
    for (let i = 0; i < periods; i++) {
      // Simulate price movement
      const change = (Math.random() - 0.5) * 10; // +/- 5 dollar movements
      currentPrice += change;
      
      const close = currentPrice;
      const high = close + Math.random() * 5;
      const low = close - Math.random() * 5;
      const volume = Math.floor(Math.random() * 5000) + 1000;
      
      closes.push(close);
      highs.push(high);
      lows.push(low);
      volumes.push(volume);
    }
    
    return { closes, highs, lows, volumes };
  }

  static async analyzeXAUUSD(): Promise<InsertTradingSignal | null> {
    const symbols = ["XAUUSD", "BTCUSD"];
    let lastSignal: InsertTradingSignal | null = null;

    for (const currentSymbol of symbols) {
      const timeframes = ['H1'];
      const analysisData: Record<string, any> = {};
      
      for (const tf of timeframes) {
        const realData = await this.fetchRealPriceData(currentSymbol);
        const { closes, highs, lows, volumes } = realData;
        
        const indicators = {
          close: closes[closes.length - 1],
          ema9: this.ema(closes, 9),
          ema21: this.ema(closes, 21),
          sma20: this.sma(closes, 20),
          rsi: this.rsi(closes),
          macd: this.macd(closes),
          bbUpper: this.bollinger(closes)[0],
          bbMiddle: this.bollinger(closes)[1],
          bbLower: this.bollinger(closes)[2],
          atr: this.atr(highs, lows, closes),
          volume: volumes[volumes.length - 1]
        };
        
        analysisData[tf] = indicators;
        
        await storage.createTechnicalIndicator({
          symbol: currentSymbol,
          timeframe: tf,
          price: indicators.close,
          ema9: indicators.ema9,
          ema21: indicators.ema21,
          sma20: indicators.sma20,
          rsi: indicators.rsi,
          macd: indicators.macd,
          bbUpper: indicators.bbUpper,
          bbMiddle: indicators.bbMiddle,
          bbLower: indicators.bbLower,
          atr: indicators.atr,
          volume: indicators.volume
        });
      }
      
      const tf = analysisData['H1'];
      if (!tf.rsi || tf.rsi <= RSI_ZONE[0] || tf.rsi >= RSI_ZONE[1]) continue;

      const price = tf.close;
      const side = price > (tf.ema21 || 0) ? 'Buy' : 'Sell';
      const entry = price;
      const trend = this.classifyTrend(tf.ema9, tf.ema21, tf.sma20);
      
      lastSignal = {
        symbol: currentSymbol,
        side,
        entry: Math.round(entry * 100) / 100,
        takeProfit: Math.round((side === 'Buy' ? entry * 1.02 : entry * 0.98) * 100) / 100,
        stopLoss: Math.round((side === 'Buy' ? entry * 0.98 : entry * 1.02) * 100) / 100,
        trailStop: Math.round(entry * 100) / 100,
        liquidation: Math.round(entry * 100) / 100,
        quantity: 1,
        marginUsdt: 10,
        trend,
        bbDirection: price > (tf.bbUpper || 0) ? "Up" : "Down",
        score: 75,
        status: "active" as const,
        pnl: 0
      };
    }
    
    return lastSignal;
  }
}
