//+------------------------------------------------------------------+
//|                XAUUSD_Hybrid_Confirmed_EA.mq5                    |
//|            Hybrid EA: ML + Indicator Confirmation               |
//+------------------------------------------------------------------+
#property copyright "2025"
#property version   "1.20"
#property strict

input string   SYMBOL       = "XAUUSD";
input double   RiskPct      = 0.015;
input double   AccountBal   = 100;

//--- indicator handle
int handleIndicator = -1;

//+------------------------------------------------------------------+
//| Read ML Signal from common folder                                |
//+------------------------------------------------------------------+
string ReadMLSignal(string filename="signal.txt")
{
   string path = TerminalInfoString(TERMINAL_COMMONDATA_PATH)+"\\Files\\"+filename;
   int handle = FileOpen(path, FILE_READ|FILE_TXT);
   if(handle == INVALID_HANDLE) return "";
   string signal = FileReadString(handle);
   FileClose(handle);
   StringTrimLeft(signal);
   StringTrimRight(signal);
   return signal;
}

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   handleIndicator = iCustom(_Symbol, _Period, "XAUUSD_Signal_Indicator");
   if(handleIndicator < 0)
   {
      Print("❌ Failed to load indicator");
      return INIT_FAILED;
   }

   Print("✅ Hybrid EA initialized. Waiting for ML + Indicator agreement...");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert tick                                                      |
//+------------------------------------------------------------------+
void OnTick()
{
   string mlSignal = ReadMLSignal();
   if(mlSignal != "Buy" && mlSignal != "Sell") return;

   double buyArr[1], sellArr[1];
   bool indicatorBuy  = (CopyBuffer(handleIndicator, 0, 0, 1, buyArr) == 1 && buyArr[0] != EMPTY_VALUE);
   bool indicatorSell = (CopyBuffer(handleIndicator, 1, 0, 1, sellArr) == 1 && sellArr[0] != EMPTY_VALUE);

   // Only trade if ML and indicator agree
   if((mlSignal=="Buy" && !indicatorBuy) || (mlSignal=="Sell" && !indicatorSell)) return;

   string side = mlSignal;
   Print("✅ ML + Indicator Confirmed Signal: ", side);

   double entry = (side=="Buy") ? SymbolInfoDouble(SYMBOL,SYMBOL_ASK)
                                : SymbolInfoDouble(SYMBOL,SYMBOL_BID);

   double sl = (side=="Buy") ? entry*0.985 : entry*1.015;
   double tp = (side=="Buy") ? entry*1.015 : entry*0.985;

   double sl_diff = MathAbs(entry - sl);
   if(sl_diff <= 0) return;
   double lotSize = NormalizeDouble(AccountBal * RiskPct / sl_diff, 2);

   if(PositionSelect(SYMBOL)) return;

   MqlTradeRequest req;
   MqlTradeResult  res;
   ZeroMemory(req);
   req.action   = TRADE_ACTION_DEAL;
   req.symbol   = SYMBOL;
   req.volume   = lotSize;
   req.type     = (side=="Buy") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   req.price    = entry;
   req.sl       = sl;
   req.tp       = tp;
   req.deviation= 20;
   req.magic    = 12345;

   if(!OrderSend(req,res))
      Print("❌ OrderSend failed: ",GetLastError());
   else
      Print("✅ ", side, " order placed at ", entry, " TP:", tp, " SL:", sl);
}
//+------------------------------------------------------------------+
