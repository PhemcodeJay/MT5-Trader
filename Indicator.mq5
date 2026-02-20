//+------------------------------------------------------------------+
//|                                      XAUUSD_Signal_Indicator.mq5 |
//|                                  Copyright 2025, MetaQuotes Ltd. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2025, MetaQuotes Ltd."
#property link      "https://www.mql5.com"
#property version   "1.10"
#property strict
#property indicator_chart_window
#property indicator_buffers 2
#property indicator_plots   2

//--- plot Buy signals
#property indicator_label1  "BuySignal"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLime
#property indicator_width1  2

//--- plot Sell signals
#property indicator_label2  "SellSignal"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrRed
#property indicator_width2  2

//--- inputs
input int    EMA_Fast     = 9;
input int    EMA_Slow     = 21;
input int    SMA_Period   = 20;
input int    RSI_Period   = 14;
input int    ATR_Period   = 14;
input int    BB_Period    = 20;
input double MinATRpct    = 0.001; // min ATR % of price
input int    RSI_Low      = 20;
input int    RSI_High     = 80;
input int    MinBars      = 50;    // bars needed before signals

//--- buffers
double BuyBuffer[];
double SellBuffer[];

//--- indicator handles
int hEMA_Fast, hEMA_Slow, hSMA, hRSI, hATR, hBB;

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
   // buffers
   SetIndexBuffer(0, BuyBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, SellBuffer, INDICATOR_DATA);

   PlotIndexSetInteger(0, PLOT_ARROW, 233); // Wingdings Up
   PlotIndexSetInteger(1, PLOT_ARROW, 234); // Wingdings Down

   ArraySetAsSeries(BuyBuffer, true);
   ArraySetAsSeries(SellBuffer, true);

   // indicator handles
   hEMA_Fast = iMA(_Symbol, _Period, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow = iMA(_Symbol, _Period, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   hSMA      = iMA(_Symbol, _Period, SMA_Period, 0, MODE_SMA, PRICE_CLOSE);
   hRSI      = iRSI(_Symbol, _Period, RSI_Period, PRICE_CLOSE);
   hATR      = iATR(_Symbol, _Period, ATR_Period);
   hBB       = iBands(_Symbol, _Period, BB_Period, 2.0, 0, PRICE_CLOSE);

   if(hEMA_Fast<0 || hEMA_Slow<0 || hSMA<0 || hRSI<0 || hATR<0 || hBB<0)
   {
      Print("❌ Failed to create indicator handles. Error: ", GetLastError());
      return(INIT_FAILED);
   }

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| OnCalculate                                                      |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double   &open[],
                const double   &high[],
                const double   &low[],
                const double   &close[],
                const long     &tick_volume[],
                const long     &volume[],
                const int      &spread[])
{
   if(rates_total <= MinBars) return(0);

   int start = (prev_calculated>0) ? prev_calculated-1 : MinBars;

   // allocate temp arrays
   static double emaFast[], emaSlow[], sma20[], rsiArr[], atrArr[], bbUp[], bbMid[], bbLow[];
   ArraySetAsSeries(emaFast,true); ArraySetAsSeries(emaSlow,true);
   ArraySetAsSeries(sma20,true);  ArraySetAsSeries(rsiArr,true);
   ArraySetAsSeries(atrArr,true); ArraySetAsSeries(bbUp,true);
   ArraySetAsSeries(bbMid,true);  ArraySetAsSeries(bbLow,true);

   // copy data for required range
   if(CopyBuffer(hEMA_Fast, 0, 0, rates_total, emaFast) < 0) return(0);
   if(CopyBuffer(hEMA_Slow, 0, 0, rates_total, emaSlow) < 0) return(0);
   if(CopyBuffer(hSMA,      0, 0, rates_total, sma20)   < 0) return(0);
   if(CopyBuffer(hRSI,      0, 0, rates_total, rsiArr)  < 0) return(0);
   if(CopyBuffer(hATR,      0, 0, rates_total, atrArr)  < 0) return(0);
   if(CopyBuffer(hBB,       0, 0, rates_total, bbUp)    < 0) return(0);
   if(CopyBuffer(hBB,       1, 0, rates_total, bbMid)   < 0) return(0);
   if(CopyBuffer(hBB,       2, 0, rates_total, bbLow)   < 0) return(0);

   for(int i=start; i<rates_total-1; i++)
   {
      BuyBuffer[i]  = EMPTY_VALUE;
      SellBuffer[i] = EMPTY_VALUE;

      double price    = close[i];
      double ema9     = emaFast[i];
      double ema21    = emaSlow[i];
      double sma      = sma20[i];
      double rsiVal   = rsiArr[i];
      double atrVal   = atrArr[i];
      double bb_upper = bbUp[i];
      double bb_lower = bbLow[i];

      // sanity check
      if(price<=0 || ema9==0 || ema21==0 || bb_upper==0 || bb_lower==0) continue;

      // filters
      if(rsiVal < RSI_Low || rsiVal > RSI_High) continue;
      if(atrVal/price < MinATRpct) continue;

      // conditions
      bool buyCond  = (price > bb_upper) || (price > ema21);
      bool sellCond = (price < bb_lower) || (price < ema21);

      if(buyCond && !sellCond)
         BuyBuffer[i] = low[i] - (3*_Point);   // arrow below candle
      else if(sellCond && !buyCond)
         SellBuffer[i] = high[i] + (3*_Point); // arrow above candle
   }

   return(rates_total);
}
//+------------------------------------------------------------------+
