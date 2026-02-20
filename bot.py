import requests
from fpdf import FPDF
from datetime import datetime, timedelta, timezone
from time import sleep
import sys
import json

# === CONFIGURATION ===
RISK_PCT = 0.015
ACCOUNT_BALANCE = 100
LEVERAGE = 20
ENTRY_BUFFER_PCT = 0.002
MIN_VOLUME = 1000
MIN_ATR_PCT = 0.001
RSI_ZONE = (20, 80)
INTERVALS = ['15', '60', '240']
SYMBOLS_TO_SCAN = ['XAUUSDT', 'BTCUSDT', 'ETHUSDT']

# === NOTIFICATIONS (keep your real ones) ===
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1392538366570135594/lwRHMnC6D1nBMnpXhxf_bdMO0PacPIZxh7-yuKv1OvQm_WhagXAwmCUR9oRpU9sIg4WH"
TELEGRAM_BOT_TOKEN = "8160938302:AAFUmPahGk14OY8F1v5FLHGoVRD-pGTvSOY"
TELEGRAM_CHAT_ID = "5852301284"

tz_utc3 = timezone(timedelta(hours=3))

# === NOTIFICATIONS ===
def send_discord(message: str):
    if not DISCORD_WEBHOOK_URL:
        return
    try:
        requests.post(DISCORD_WEBHOOK_URL, json={"content": message}, timeout=10)
    except:
        pass

def send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=10)
    except:
        pass

# === PDF ===
class SignalPDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 12)
        self.cell(0, 10, "Bybit Signals - XAU/BTC/ETH", 0, 1, "C")
        self.ln(5)
    def add_signal(self, s):
        self.set_font("Courier", "B", 10)
        self.set_text_color(0, 80, 180)
        self.cell(0, 6, f"=================== {s['Symbol']} ===================", ln=1, align="C")
        self.set_font("Courier", "", 9)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 5, f"Type: {s['Type']} | Side: {s['Side']} | Score: {s['Score']}%")
        self.set_text_color(0, 120, 0)
        self.multi_cell(0, 5, f"Entry: {s['Entry']} | TP: {s['TP']} | SL: {s['SL']}")
        self.set_text_color(139, 0, 0)
        self.multi_cell(0, 5, f"Market: {s['Market']} | BB: {s['BB Slope']} | Trail: {s['Trail']}")
        self.set_text_color(0, 100, 100)
        self.multi_cell(0, 5, f"Margin: {s['Margin']} | Liq: {s['Liq']} | Time: {s['Time']}")
        self.ln(3)

# === INDICATORS ===
def get_candles(symbol: str, interval: str):
    url = "https://api.bybit.com/v5/market/kline"
    params = {"category": "linear", "symbol": symbol, "interval": interval, "limit": 200}
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
        if data.get('retCode') != 0:
            return []
        klines = data['result']['list']
        return [{
            'high': float(k[2]),
            'low': float(k[3]),
            'close': float(k[4]),
            'volume': float(k[5])
        } for k in reversed(klines)]
    except Exception as e:
        print(f"[ERROR] {symbol} {interval}m → {e}")
        return []

def ema(values, period):
    if len(values) < period: return None
    k = 2 / (period + 1)
    ema_val = sum(values[:period]) / period
    for p in values[period:]:
        ema_val = p * k + ema_val * (1 - k)
    return ema_val

def sma(values, period):
    if len(values) < period: return None
    return sum(values[-period:]) / period

def rsi(prices, period=14):
    if len(prices) < period + 1: return None
    gains = losses = 0
    for i in range(1, period + 1):
        diff = prices[i] - prices[i-1]
        if diff > 0: gains += diff
        else: losses -= diff
    avg_gain = gains / period
    avg_loss = losses / period or 1e-10
    return 100 - (100 / (1 + avg_gain / avg_loss))

def bollinger(prices, period=20, mult=2):
    mid = sma(prices, period)
    if mid is None: return None, None, None
    std = (sum((p - mid)**2 for p in prices[-period:]) / period)**0.5
    return mid + mult*std, mid, mid - mult*std

def atr(highs, lows, closes, period=14):
    if len(highs) < period + 1: return None
    trs = [max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1])) 
           for i in range(1, len(highs))]
    atr_val = sum(trs[:period]) / period
    for tr in trs[period:]:
        atr_val = (atr_val * (period-1) + tr) / period
    return atr_val

def macd_diff(prices):
    e12 = ema(prices, 12)
    e26 = ema(prices, 26)
    return (e12 - e26) if e12 and e26 else None

def classify_trend(e9, e21, s20):
    if e9 > e21 > s20: return "Strong Trend"
    if e9 > e21: return "Trend"
    if e9 > s20: return "Swing"
    return "Scalp"

# === MAIN ANALYSIS ===
def analyze(symbol: str):
    data = {}
    for tf in INTERVALS:
        candles = get_candles(symbol, tf)
        if len(candles) < 50: 
            return None
        closes = [c['close'] for c in candles]
        highs = [c['high'] for c in candles]
        lows = [c['low'] for c in candles]
        volumes = [c['volume'] for c in candles]

        data[tf] = {
            'close': closes[-1],
            'ema9': ema(closes, 9),
            'ema21': ema(closes, 21),
            'sma20': sma(closes, 20),
            'rsi': rsi(closes),
            'macd': macd_diff(closes),
            'bb_up': bollinger(closes)[0],
            'bb_mid': bollinger(closes)[1],
            'bb_low': bollinger(closes)[2],
            'atr': atr(highs, lows, closes),
            'volume': volumes[-1]
        }

    h1 = data['60']   # FIXED: was h1_1h and then used h → error!

    # Filters on 1h timeframe
    if (h1['volume'] < MIN_VOLUME or 
        h1['atr'] / h1['close'] < MIN_ATR_PCT or 
        not (RSI_ZONE[0] < h1['rsi'] < RSI_ZONE[1])):
        return None

    # Multi-timeframe direction alignment
    sides = []
    for d in data.values():
        c = d['close']
        if c > d['bb_up'] or c > d['ema21']:
            sides.append('LONG')
        elif c < d['bb_low'] or c < d['ema21']:
            sides.append('SHORT')

    if len(set(sides)) != 1:
        return None

    side = sides[0]
    price = h1['close']
    bb_slope = "Up" if price > h1['bb_up'] else "Down" if price < h1['bb_low'] else "Flat"
    trend_type = classify_trend(h1['ema9'], h1['ema21'], h1['sma20'])

    # Entry level (closest strong level)
    levels = [h1['ema9'], h1['ema21'], h1['sma20']]
    entry = min(levels, key=lambda x: abs(x - price)) if side == 'LONG' else max(levels, key=lambda x: abs(x - price))

    tp = round(entry * (1.015 if side == 'LONG' else 0.985), 6)
    sl = round(entry * (0.985 if side == 'LONG' else 1.015), 6)
    trail = round(entry * (1 - ENTRY_BUFFER_PCT if side == 'LONG' else 1 + ENTRY_BUFFER_PCT), 6)
    liq = round(entry * (1 - 1/LEVERAGE if side == 'LONG' else 1 + 1/LEVERAGE), 6)

    # Position sizing
    sl_distance = abs(entry - sl) or 0.000001
    risk_amount = ACCOUNT_BALANCE * RISK_PCT
    margin = max(round((risk_amount / sl_distance) * entry / LEVERAGE, 6), 0.001)

    # Scoring
    score = 0.0
    score += 0.35 if h1['macd'] > 0 else -0.05
    score += 0.25 if h1['rsi'] < 30 or h1['rsi'] > 70 else 0.1
    score += 0.30 if bb_slope != "Flat" else 0.05
    score += 0.30 if "Trend" in trend_type else 0.15

    return {
        'Symbol': symbol,
        'Side': side,
        'Type': trend_type,
        'Score': round(score * 100, 1),
        'Entry': round(entry, 6),
        'TP': tp,
        'SL': sl,
        'Trail': trail,
        'Margin': margin,
        'Market': round(price, 6),
        'Liq': liq,
        'BB Slope': bb_slope,
        'Time': datetime.now(tz_utc3).strftime("%Y-%m-%d %H:%M UTC+3")
    }

# === FORMATTING ===
def format_signal(s):
    return (
        f"==================== {s['Symbol']} ====================\n"
        f"Type: {s['Type']} | Side: **{s['Side']}** | Score: {s['Score']}%\n"
        f"Entry: `{s['Entry']}` | TP: `{s['TP']}` | SL: `{s['SL']}`\n"
        f"Market: {s['Market']} | BB: {s['BB Slope']} | Trail: {s['Trail']}\n"
        f"Margin: {s['Margin']} | Liq: {s['Liq']}\n"
        f"Time: {s['Time']}\n"
        "══════════════════════════════════════════════════\n"
    )

# === MAIN LOOP ===
def main():
    print("Bybit Signal Scanner [XAUUSDT, BTCUSDT, ETHUSDT] Started...\n")
    while True:
        print(f"Scanning at {datetime.now(tz_utc3).strftime('%H:%M UTC+3')}...")
        signals = []
        for sym in SYMBOLS_TO_SCAN:
            sig = analyze(sym)
            if sig:
                signals.append(sig)
                print(f"→ {sym} {sig['Side']} | Score {sig['Score']}%")

        if signals:
            signals.sort(key=lambda x: x['Score'], reverse=True)
            blocks = [format_signal(s) for s in signals]
            msg = "\n".join(blocks)

            print("\nSIGNALS FOUND:\n" + msg)

            # PDF
            fname = f"signals_{datetime.now(tz_utc3).strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf = SignalPDF()
            pdf.add_page()
            for s in signals:
                pdf.add_signal(s)
            pdf.output(fname)
            print(f"PDF saved → {fname}")

            # Notifications
            header = f"New Bybit Signals ({len(signals)})"
            send_discord(header + "\n\n" + msg)
            send_telegram("*" + header + "*\n\n" + msg)
            print("Alerts sent!\n")

            # Save latest signals to JSON
            try:
                with open("latest_signals.json", "w") as f:
                    json.dump(signals, f)
            except Exception:
                pass
        else:
            print("No strong aligned signals right now.\n")
            print("No strong aligned signals right now.\n")

        # 15-minute wait
        for i in range(900, 0, -1):
            m, s = divmod(i, 60)
            sys.stdout.write(f"\rNext scan in {m:02d}:{s:02d}")
            sys.stdout.flush()
            sleep(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nScanner stopped by user.")