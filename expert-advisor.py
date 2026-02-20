import MetaTrader5 as mt5
from datetime import datetime
from fpdf import FPDF
import time
import pandas as pd

# === CONFIG ===
SYMBOL = "XAUUSD"
RISK_PCT = 0.015
ACCOUNT_BALANCE = 100
LEVERAGE = 20
ENTRY_BUFFER_PCT = 0.002
MIN_VOLUME = 1000
MIN_ATR_PCT = 0.001
RSI_ZONE = (20, 80)
INTERVALS = {
    'M15': mt5.TIMEFRAME_M15,
    'H1': mt5.TIMEFRAME_H1,
    'H4': mt5.TIMEFRAME_H4
}
MAX_BARS = 500

# === PDF Output ===
class SignalPDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 12)
        self.cell(0, 10, "XAUUSD Signal Report", ln=True, align="C")

    def add_signal(self, s):
        self.set_font("Courier", "", 10)
        self.set_text_color(0)
        self.multi_cell(0, 8, f"""
Symbol: {s['Symbol']}
Side: {s['Side']}      Trend: {s['Trend']}      Score: {s['Score']}%
Entry: {s['Entry']}    TP: {s['TP']}    SL: {s['SL']}
Trail: {s['Trail']}    Qty: {s['Qty']}    Margin: {s['Margin_USDT']} USDT
BB Direction: {s['BB_Direction']}   Liq: {s['Liq']}
Time: {s['Time']}
{'=' * 60}
""")

# === Indicators ===
def ema(prices, period):
    if len(prices) < period:
        return None
    mult = 2 / (period + 1)
    val = sum(prices[:period]) / period
    for p in prices[period:]:
        val = (p - val) * mult + val
    return val

def sma(prices, period):
    if len(prices) < period:
        return None
    return sum(prices[-period:]) / period

def rsi(prices, period=14):
    if len(prices) < period + 1:
        return None
    gains = [max(prices[i] - prices[i - 1], 0) for i in range(1, period + 1)]
    losses = [max(prices[i - 1] - prices[i], 0) for i in range(1, period + 1)]
    ag, al = sum(gains) / period, sum(losses) / period
    rs = ag / (al + 1e-10)
    return 100 - (100 / (1 + rs))

def bollinger(prices, period=20, sd=2):
    mid = sma(prices, period)
    if mid is None:
        return None, None, None
    var = sum((p - mid) ** 2 for p in prices[-period:]) / period
    std = var ** 0.5
    return mid + sd * std, mid, mid - sd * std

def atr(highs, lows, closes, period=14):
    if len(highs) < period + 1:
        return None
    trs = [max(h - l, abs(h - c), abs(l - c)) for h, l, c in zip(highs[1:], lows[1:], closes[:-1])]
    val = sum(trs[:period]) / period
    for t in trs[period:]:
        val = (val * (period - 1) + t) / period
    return val

def macd(prices):
    fast = ema(prices, 12)
    slow = ema(prices, 26)
    return fast - slow if fast and slow else None

def classify_trend(e9, e21, s20):
    if e9 > e21 > s20:
        return "Trend"
    if e9 > e21:
        return "Swing"
    return "Scalp"

# === Fetch MT5 Candles ===
def get_candles(symbol, timeframe, bars=MAX_BARS):
    rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, bars)
    if rates is None or len(rates) == 0:
        return None
    return pd.DataFrame(rates)

# === Analyze XAUUSD ===
def analyze(symbol):
    data = {}
    for tf_name, tf in INTERVALS.items():
        df = get_candles(symbol, tf)
        if df is None or len(df) < 30:
            return None
        closes = df['close'].tolist()
        highs = df['high'].tolist()
        lows = df['low'].tolist()
        vols = df['tick_volume'].tolist()
        data[tf_name] = {
            'close': closes[-1],
            'ema9': ema(closes, 9),
            'ema21': ema(closes, 21),
            'sma20': sma(closes, 20),
            'rsi': rsi(closes),
            'macd': macd(closes),
            'bb_up': bollinger(closes)[0],
            'bb_mid': bollinger(closes)[1],
            'bb_low': bollinger(closes)[2],
            'atr': atr(highs, lows, closes),
            'volume': vols[-1]
        }

    tf = data['H1']
    if (tf['volume'] < MIN_VOLUME or (tf['atr'] / tf['close']) < MIN_ATR_PCT or
        not (RSI_ZONE[0] < tf['rsi'] < RSI_ZONE[1])):
        return None

    sides = []
    for d in data.values():
        if d['close'] > d['bb_up']:
            sides.append('LONG')
        elif d['close'] < d['bb_low']:
            sides.append('SHORT')
        elif d['close'] > d['ema21']:
            sides.append('LONG')
        elif d['close'] < d['ema21']:
            sides.append('SHORT')

    if len(set(sides)) != 1:
        return None

    price = tf['close']
    trend = classify_trend(tf['ema9'], tf['ema21'], tf['sma20'])
    bb_dir = "Up" if price > tf['bb_up'] else "Down" if price < tf['bb_low'] else "No"
    opts = [tf['sma20'], tf['ema9'], tf['ema21']]
    entry = min(opts, key=lambda x: abs(x - price))

    side = 'Buy' if sides[0] == 'LONG' else 'Sell'
    tp = round(entry * (1.015 if side == 'Buy' else 0.985), 3)
    sl = round(entry * (0.985 if side == 'Buy' else 1.015), 3)
    trail = round(entry * (1 - ENTRY_BUFFER_PCT) if side == 'Buy' else entry * (1 + ENTRY_BUFFER_PCT), 3)
    liq = round(entry * (1 - 1 / LEVERAGE) if side == 'Buy' else entry * (1 + 1 / LEVERAGE), 3)

    try:
        risk_amt = ACCOUNT_BALANCE * RISK_PCT
        sl_diff = abs(entry - sl)
        qty = risk_amt / sl_diff
        margin_usdt = round((qty * entry) / LEVERAGE, 2)
        qty = round(qty, 3)
    except:
        margin_usdt = 1.0
        qty = 1.0

    score = 0
    score += 0.3 if tf['macd'] and tf['macd'] > 0 else 0
    score += 0.2 if tf['rsi'] < 30 or tf['rsi'] > 70 else 0
    score += 0.2 if bb_dir != "No" else 0
    score += 0.3 if trend == "Trend" else 0

    return {
        'Symbol': symbol,
        'Side': side,
        'Entry': round(entry, 3),
        'TP': tp,
        'SL': sl,
        'Trail': trail,
        'Liq': liq,
        'Qty': qty,
        'Margin_USDT': margin_usdt,
        'Trend': trend,
        'BB_Direction': bb_dir,
        'Score': round(score * 100, 2),
        'Time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

# === Console Formatter ===
def format_signal(s):
    return (
        f"\n📡 XAUUSD Signal\n"
        f"Type: {s['Trend']} | Side: {s['Side']} | Score: {s['Score']}%\n"
        f"Entry: {s['Entry']} | TP: {s['TP']} | SL: {s['SL']} | Trail: {s['Trail']}\n"
        f"Qty: {s['Qty']} | Margin: {s['Margin_USDT']} USDT | Liq: {s['Liq']}\n"
        f"BB: {s['BB_Direction']} | Time: {s['Time']}\n"
        f"{'=' * 60}"
    )

# === Main ===
def main():
    print("🔄 Connecting to MetaTrader 5...")
    if not mt5.initialize():
        print("❌ MT5 Initialization failed")
        return

    print("✅ Connected to MT5")

    while True:
        print(f"\n🔍 Scanning {SYMBOL} for signals...")
        signal = analyze(SYMBOL)

        if signal:
            print(format_signal(signal))

            # Save to PDF
            pdf = SignalPDF()
            pdf.add_page()
            pdf.add_signal(signal)
            filename = f"signals_xauusd_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf.output(filename)
            print(f"📄 Signal exported to {filename}")
        else:
            print("⚠️ No valid signal found.")

        # Countdown timer (1 hour = 3600 seconds)
        print("\n⏳ Waiting 1 hour for next scan...")
        for remaining in range(3600, 0, -1):
            mins, secs = divmod(remaining, 60)
            print(f"\r   Next scan in {mins:02}:{secs:02}", end="")
            time.sleep(1)
        print("\n")  # new line after countdown finishes


if __name__ == "__main__":
    main()
