import time
from tensorflow.keras.models import load_model
import numpy as np

# Load your trained ML model
model = load_model("xau_model.h5")

def ml_predict(features):
    X = np.array(features).reshape(1, -1)
    prob = model.predict(X)[0][0]
    return "Buy" if prob > 0.5 else "Sell"

while True:
    # --- example features (replace with real market data fetch)
    features = [1920.5, 1921.3, 1919.8, 55.2, 0.004, 1200]  # close, ema9, ema21, rsi, atr, volume
    signal = ml_predict(features)

    # --- write ML decision to MT5 shared file
    with open(r"C:\Users\Bossman\AppData\Roaming\MetaQuotes\Terminal\Common\Files\signal.txt", "w") as f:
        f.write(signal)

    print("ML Decision:", signal)
    time.sleep(60)  # run every minute
