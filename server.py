# server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import json
import os
import threading
import time
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Golden Lion Backend")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LATEST_FILE = Path("latest_signals.json")
SCAN_LOCK_FILE = Path("scan.lock")  # Prevents multiple scans at once


# === Reuse your candle fetching logic ===
def get_bybit_candles(symbol: str = "XAUUSDT", interval: str = "5", limit: int = 200):
    try:
        url = "https://api.bybit.com/v5/market/kline"
        params = {
            "category": "linear",
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("retCode") != 0:
            return []

        klines = data["result"]["list"]
        return [{
            "time": int(k[0]) // 1000,   # Bybit returns ms
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4])
        } for k in reversed(klines)]
    except Exception as e:
        print(f"[Candle Error] {symbol}: {e}")
        return []


# === Import and run your bot's analysis directly (BEST WAY) ===
def run_scanner_and_save():
    if SCAN_LOCK_FILE.exists():
        print("Scan already running...")
        return

    SCAN_LOCK_FILE.touch()
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting scan...")
        
        # Import your bot logic directly (cleaner than subprocess)
        from bot import analyze, SYMBOLS_TO_SCAN

        signals = []
        for sym in SYMBOLS_TO_SCAN:
            sig = analyze(sym)
            if sig:
                # Convert 'LONG'/'SHORT' → 'Buy'/'Sell' for dashboard
                sig["Side"] = "Buy" if sig["Side"] == "LONG" else "Sell"
                signals.append(sig)

        # Save to file for frontend
        if signals:
            signals.sort(key=lambda x: x["Score"], reverse=True)
            with open(LATEST_FILE, "w") as f:
                json.dump(signals, f, indent=2)
            print(f"Found {len(signals)} signals → saved!")
        else:
            # Save empty list if no signals
            LATEST_FILE.write_text("[]")
            print("No signals found.")

    except Exception as e:
        print(f"[Scanner Error] {e}")
        LATEST_FILE.write_text("[]")
    finally:
        SCAN_LOCK_FILE.unlink(missing_ok=True)


# === API Endpoints ===

@app.get("/candles")
async def get_candles(symbol: str = "XAUUSDT", interval: str = "5"):
    candles = get_bybit_candles(symbol, interval)
    return {"candles": candles}


@app.get("/latest_signals")
async def latest_signals():
    if LATEST_FILE.exists():
        try:
            with open(LATEST_FILE) as f:
                return json.load(f)
        except:
            pass
    return []


@app.post("/trigger_scan")
async def trigger_scan():
    # Run in background thread (non-blocking)
    thread = threading.Thread(target=run_scanner_and_save, daemon=True)
    thread.start()
    
    return JSONResponse({
        "status": "scan_started",
        "message": "Scanning XAUUSDT, BTCUSDT, ETHUSDT...",
        "timestamp": datetime.now().isoformat()
    })


# Optional: Auto-scan every 15 minutes
def auto_scanner():
    while True:
        time.sleep(900)  # 15 minutes
        if not SCAN_LOCK_FILE.exists():
            print("Auto-scan triggered...")
            run_scanner_and_save()

# Start auto-scanner in background
threading.Thread(target=auto_scanner, daemon=True).start()

print("Golden Lion Backend Running → http://localhost:8000")
print("Dashboard: http://localhost:8000 (open index.html)")

# Run with:
# uvicorn server:app --port 8000 --reload