import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tradingSignals = pgTable("trading_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().default("XAUUSD"),
  side: text("side").notNull(), // "Buy" | "Sell"
  entry: real("entry").notNull(),
  takeProfit: real("take_profit").notNull(),
  stopLoss: real("stop_loss").notNull(),
  trailStop: real("trail_stop").notNull(),
  liquidation: real("liquidation").notNull(),
  quantity: real("quantity").notNull(),
  marginUsdt: real("margin_usdt").notNull(),
  trend: text("trend").notNull(), // "Trend" | "Swing" | "Scalp"
  bbDirection: text("bb_direction").notNull(), // "Up" | "Down" | "No"
  score: real("score").notNull(),
  status: text("status").notNull().default("active"), // "active" | "closed" | "cancelled"
  pnl: real("pnl").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const technicalIndicators = pgTable("technical_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().default("XAUUSD"),
  timeframe: text("timeframe").notNull(), // "M15" | "H1" | "H4"
  price: real("price").notNull(),
  ema9: real("ema9"),
  ema21: real("ema21"),
  sma20: real("sma20"),
  rsi: real("rsi"),
  macd: real("macd"),
  bbUpper: real("bb_upper"),
  bbMiddle: real("bb_middle"),
  bbLower: real("bb_lower"),
  atr: real("atr"),
  volume: integer("volume"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  riskPercent: real("risk_percent").default(1.5),
  leverage: integer("leverage").default(20),
  accountBalance: real("account_balance").default(100),
  theme: text("theme").default("dark"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradingSignalSchema = createInsertSchema(tradingSignals).omit({
  id: true,
  createdAt: true,
});

export const insertTechnicalIndicatorSchema = createInsertSchema(technicalIndicators).omit({
  id: true,
  timestamp: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = z.infer<typeof insertTradingSignalSchema>;
export type TechnicalIndicator = typeof technicalIndicators.$inferSelect;
export type InsertTechnicalIndicator = z.infer<typeof insertTechnicalIndicatorSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
