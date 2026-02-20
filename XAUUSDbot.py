# === XAUUSD SIGNAL SCANNER (MT5) - Updated with Bybit-style Logic ===
# Uses $100 equity, proper risk management, robust MT5 init, better filters

import MetaTrader5 as mt5
import requests
from datetime import datetime, timedelta, timezone
from time import sleep
import sys
import json

# Optional PDF support
try:
    from fpdf import FPDF
except ImportError:
    FPDF = None

# ================= CONFIGURATION =================
SYMBOL = "XAUUSD"
ACCOUNT_BALANCE = 100.0        # Your equity
RISK_PCT = 0.015               # 1.5% risk per trade
LEVERAGE = 20
ENTRY_BUFFER_PCT = 0.002       # 0.2% buffer for trail entry
MIN_VOLUME = 500               # Minimum tick volume filter
MIN_ATR_PCT = 0.001            # Minimum volatility
RSI_ZONE = (20, 80)

# Timeframes
MAIN_TF = mt5.TIMEFRAME_M5
CONFIRM_TFS = [mt5.TIMEFRAME_M3, mt5.TIMEFRAME_M1]

tz_utc3 = timezone(timedelta(hours=3))

# Notifications (optional - add your own)
DISCORD_WEBHOOK = ""  # Put your Discord webhook here if wanted
TELEGRAM_TOKEN = ""   # Optional
TELEGRAM_CHAT_ID = ""

# ================= MT5 ROBUST INITIALIZATION =================
def init_mt5():
    if mt5.initialize():
        print("MT5 initialized successfully")
        account_info = mt5.account_info()
        if account_info:
            print(f"Connected to account #{account_info.login} | Balance: ${account_info.balance}")
        return True
    else:
        print("MT5 initialize() failed, error code =", mt5.last_error())
        print("Trying alternative initialization (login required)...")
        # Try with login (common fix for some brokers)
        logins = [12345678, 1234567, 87654321]  # Try common demo accounts or your real one
        for login in logins:
            if mt5.initialize(login=login, server="YourBrokerServer", password=""):  # Change server!
                print(f"MT5 connected with login {login}")
                return True
        print("Failed to connect to MT5 after retries.")
        return False

# ================= INDICATORS =================
def ema(values, period):
    if len(values) < period: return None
    k = 2 / (period + 1)
    ema_val = sum(values[:period]) / period
    for price in values[period:]:
        ema_val = price * k + ema_val * (1 - k)
    return round(ema_val, 6)

def sma(values, period):
    if len(values) < period: return None
    return round(sum(values[-period:]) / period, 6)

def rsi(prices, period=14):
    if len(prices) < period + 1: return None
    gains = losses = 0
    for i in range(1, period + 1):
        diff = prices[i] - prices[i-1]
        if diff > 0: gains += diff
        else: losses -= diff
    avg_gain = gains / period
    avg_loss = max(losses / period, 1e-10)
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)

def bollinger(prices, period=20, mult=2):
    mid = sma(prices, period)
    if not mid: return None, None, None
    std = (sum((p - mid)**2 for p in prices[-period:]) / period)**0.5
    return round(mid + mult*std, 6), round(mid, 6), round(mid - mult*std, 6)

def atr(highs, lows, closes, period=14):
    if len(highs) < period + 1: return None
    trs = []
    for i in range(1, len(highs)):
        tr = max(highs[i] - lows[i],
                 abs(highs[i] - closes[i-1]),
                 abs(lows[i] - closes[i-1]))
        trs.append(tr)
    atr_val = sum(trs[:period]) / period
    for tr in trs[period:]:
        atr_val = (atr_val * (period - 1) + tr) / period
    return round(atr_val, 6)

# ================= DATA FETCH =================
def get_rates(tf, count=300):
    rates = mt5.copy_rates_from_pos(SYMBOL, tf, 0, count)
    if rates is None or len(rates) == 0:
        print(f"No data for {tf}")
        return []
    return rates

# ================= SIGNAL ANALYSIS =================
def analyze_xau():
    main_rates = get_rates(MAIN_TF)
    if len(main_rates) < 100: return None

    closes = [r.close for r in main_rates]
    highs = [r.high for r in main_rates]
    lows = [r.low for r in main_rates]
    volumes = [r.tick_volume for r in main_rates]

    # Main TF indicators (5M)
    current_price = closes[-1]
    ema9 = ema(closes, 9)
    ema21 = ema(closes, 21)
    sma20 = sma(closes, 20)
    rsi_val = rsi(closes)
    bb_up, bb_mid, bb_low = bollinger(closes)
    macd_diff = (ema(closes, 12) or 0) - (ema(closes, 26) or 0)
    atr_val = atr(highs, lows, closes)

    if None in (ema9, ema21, sma20, rsi_val, bb_up, atr_val):
        return None

    # Filters
    if volumes[-1] < MIN_VOLUME:
        return None
    if atr_val / current_price < MIN_ATR_PCT:
        return None
    if not (RSI_ZONE[0] < rsi_val < RSI_ZONE[1]):
        return None

    # Multi-timeframe confirmation
    for tf in CONFIRM_TFS:
        conf_rates = get_rates(tf, 100)
        if len(conf_rates) < 50: return None
        conf_closes = [r.close for r in conf_rates]
        conf_ema21 = ema(conf_closes, 21)
        if not conf_ema21: return None
        conf_price = conf_closes[-1]

        # Direction conflict check
        main_bull = current_price > ema21
        conf_bull = conf_price > conf_ema21
        if main_bull != conf_bull:
            return None  # Misaligned

    # Determine side
    side = "LONG" if current_price > ema21 else "SHORT"
    is_bb_break = current_price > bb_up if side == "LONG" else current_price < bb_low
    bb_slope = "Up" if current_price > bb_up else "Down" if current_price < bb_low else "Flat"

    # Trend classification
    trend_type = "Strong Trend" if ema9 > ema21 > sma20 else \
                 "Trend" if ema9 > ema21 else \
                 "Swing" if ema9 > sma20 else "Scalp"

    # Entry = current price (market) or pullback to EMA21
    entry = round(current_price, 2)

    tp = round(entry * 1.015 if side == "LONG" else entry * 0.985, 2)
    sl = round(entry * 0.985 if side == "LONG" else entry * 1.015, 2)
    trail = round(entry * (1 - ENTRY_BUFFER_PCT) if side == "LONG" else entry * (1 + ENTRY_BUFFER_PCT), 2)
    liq = round(entry * (1 - 1/LEVERAGE) if side == "LONG" else entry * (1 + 1/LEVERAGE), 2)

    # Risk-based position size
    sl_distance = abs(entry - sl)
    risk_amount = ACCOUNT_BALANCE * RISK_PCT
    contract_size = 100  # XAUUSD: 100 oz per lot
    margin_per_lot = entry * contract_size / LEVERAGE
    max_lots = ACCOUNT_BALANCE / margin_per_lot * 0.9  # 90% max margin use
    risk_lots = risk_amount / (sl_distance * contract_size)
    lots = round(min(risk_lots, max_lots, 0.05), 2)  # Cap at 0.05 lots
    lots = max(lots, 0.01)  # Minimum 0.01

    margin_used = round(lots * margin_per_lot, 2)

    # Scoring
    score = 0.0
    score += 0.35 if macd_diff > 0 else -0.1
    score += 0.25 if rsi_val < 30 or rsi_val > 70 else 0.15
    score += 0.30 if is_bb_break else 0.1
    score += 0.30 if "Trend" in trend_type else 0.1

    return {
        "Symbol": SYMBOL,
        "Side": side,
        "Type": trend_type,
        "Score": round(score * 100, 1),
        "Entry": entry,
        "TP": tp,
        "SL": sl,
        "Trail": trail,
        "Qty": lots,
        "Margin": margin_used,
        "Liq": liq,
        "Market": entry,
        "BB Slope": bb_slope,
        "RSI": rsi_val,
        "Time": datetime.now(tz_utc3).strftime("%Y-%m-%d %H:%M UTC+3")
    }

# ================= FORMATTING =================
def format_signal(s):
    return (
        f"{'='*50}\n"
        f"        XAUUSD SIGNAL DETECTED\n"
        f"{'='*50}\n"
        f"Type: {s['Type']}\n"
        f"Side: **{s['Side']}**   |   Score: {s['Score']}%\n"
        f"Entry: `{s['Entry']}`   |   TP: `{s['TP']}`   |   SL: `{s['SL']}`\n"
        f"Trail Entry: {s['Trail']}   |   BB: {s['BB Slope']}\n"
        f"Lots: {s['Qty']}   |   Margin: ~${s['Margin']}   |   Liq: {s['Liq']}\n"
        f"RSI: {s['RSI']}   |   Time: {s['Time']}\n"
        f"{'='*50}\n"
    )

# ================= PDF (Optional) =================
if FPDF:
    class PDF(FPDF):
        def header(self):
            self.set_font("Arial", "B", 12)
            self.cell(0, 10, "XAUUSD 5M Signal + 3M/1M Confirmation", ln=1, align="C")
        def add_signal(self, s):
            self.set_font("Courier", "", 10)
            self.multi_cell(0, 6, format_signal(s).replace("**", "").replace("`", ""))
else:
    class PDF:
        def add_page(self): pass
        def add_signal(self, s): pass
        def output(self, n): print(f"PDF skipped: {n}")

# ================= NOTIFICATIONS =================
def notify(signal):
    msg = format_signal(signal)
    print(msg)

    if DISCORD_WEBHOOK:
        try:
            requests.post(DISCORD_WEBHOOK, json={"content": msg}, timeout=5)
        except: pass

# ================= MAIN LOOP =================
def main():
    if not init_mt5():
        print("Cannot start without MT5 connection.")
        return

    print(f"\nXAUUSD 5M Scanner Started | Equity: ${ACCOUNT_BALANCE} | Leverage: {LEVERAGE}x\n")

    while True:
        print(f"Scanning {datetime.now(tz_utc3).strftime('%H:%M')}...")
        signal = analyze_xau()

        if signal and signal['Score'] >= 65:  # Only high-quality signals
            notify(signal)

            # Save PDF
            pdf = PDF()
            pdf.add_page()
            pdf.add_signal(signal)
            filename = f"XAUUSD_{datetime.now(tz_utc3).strftime('%Y%m%d_%H%M')}.pdf"
            pdf.output(filename)
            print(f"PDF Saved: {filename}\n")

            # Save JSON
            try:
                with open("latest_xau_signal.json", "w") as f:
                    json.dump(signal, f, indent=2)
            except: pass
        else:
            print("No strong signal (Score < 65%)")

        # Wait until next 5-minute candle
        for i in range(300, 0, -1):
            m, s = divmod(i, 60)
            print(f"\rNext scan in {m:02d}:{s:02d}", end="")
            sys.stdout.flush()
            sleep(1)
        print("\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nScanner stopped by user.")
        mt5.shutdown()