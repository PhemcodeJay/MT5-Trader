import { type User, type InsertUser, type TradingSignal, type InsertTradingSignal, type TechnicalIndicator, type InsertTechnicalIndicator, type UserSettings, type InsertUserSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trading Signals
  getTradingSignals(limit?: number): Promise<TradingSignal[]>;
  getActiveTradingSignal(): Promise<TradingSignal | undefined>;
  createTradingSignal(signal: InsertTradingSignal): Promise<TradingSignal>;
  updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined>;
  
  // Technical Indicators
  getTechnicalIndicators(timeframe?: string): Promise<TechnicalIndicator[]>;
  getLatestTechnicalIndicators(timeframe: string): Promise<TechnicalIndicator | undefined>;
  createTechnicalIndicator(indicator: InsertTechnicalIndicator): Promise<TechnicalIndicator>;
  
  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tradingSignals: Map<string, TradingSignal>;
  private technicalIndicators: Map<string, TechnicalIndicator>;
  private userSettings: Map<string, UserSettings>;

  constructor() {
    this.users = new Map();
    this.tradingSignals = new Map();
    this.technicalIndicators = new Map();
    this.userSettings = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTradingSignals(limit: number = 50): Promise<TradingSignal[]> {
    const signals = Array.from(this.tradingSignals.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    return signals.slice(0, limit);
  }

  async getActiveTradingSignal(): Promise<TradingSignal | undefined> {
    return Array.from(this.tradingSignals.values())
      .find(signal => signal.status === "active");
  }

  async createTradingSignal(insertSignal: InsertTradingSignal): Promise<TradingSignal> {
    const id = randomUUID();
    const signal: TradingSignal = { 
      ...insertSignal, 
      id, 
      createdAt: new Date()
    };
    this.tradingSignals.set(id, signal);
    return signal;
  }

  async updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined> {
    const signal = this.tradingSignals.get(id);
    if (!signal) return undefined;
    
    const updatedSignal = { ...signal, ...updates };
    this.tradingSignals.set(id, updatedSignal);
    return updatedSignal;
  }

  async getTechnicalIndicators(timeframe?: string): Promise<TechnicalIndicator[]> {
    const indicators = Array.from(this.technicalIndicators.values());
    if (timeframe) {
      return indicators.filter(indicator => indicator.timeframe === timeframe);
    }
    return indicators;
  }

  async getLatestTechnicalIndicators(timeframe: string): Promise<TechnicalIndicator | undefined> {
    const indicators = await this.getTechnicalIndicators(timeframe);
    return indicators.sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())[0];
  }

  async createTechnicalIndicator(insertIndicator: InsertTechnicalIndicator): Promise<TechnicalIndicator> {
    const id = randomUUID();
    const indicator: TechnicalIndicator = { 
      ...insertIndicator, 
      id, 
      timestamp: new Date()
    };
    this.technicalIndicators.set(id, indicator);
    return indicator;
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(settings => settings.userId === userId);
  }

  async updateUserSettings(userId: string, settingsUpdate: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existingSettings = await this.getUserSettings(userId);
    const id = existingSettings?.id || randomUUID();
    
    const settings: UserSettings = {
      id,
      userId,
      riskPercent: 1.5,
      leverage: 20,
      accountBalance: 100,
      theme: "dark",
      ...existingSettings,
      ...settingsUpdate
    };
    
    this.userSettings.set(id, settings);
    return settings;
  }
}

export const storage = new MemStorage();
