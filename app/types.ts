export type JudgementResult = "OK" | "NG" | "CHECK";
export type SalesFrequency = "high" | "medium" | "low";

export interface SearchConditions {
  brand: string;
  category: string;
  priceMin: number;
  priceMax: number;
  modelNumber: string;
}

export interface SimulationSettings {
  purchasePrice: number;
  shippingCost: number;
  targetMarginRate: number;
}

export interface CalculationResult {
  estimatedPrice: number;
  mercariCommission: number;
  shippingCost: number;
  netProfit: number;
  marginRate: number;
  judgement: JudgementResult;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  brand: string;
  category: string;
  modelNumber?: string;
  priceMin?: number;
  priceMax?: number;
  purchasePrice: number;
  targetMarginRate?: number;
  judgement: JudgementResult;
  marginRate: number;
  netProfit: number;
}

export interface ProductCandidate {
  id: string;
  name: string;
  brand: string;
  category: string;
  modelNumber: string;
  observedPriceMin: number;
  observedPriceMax: number;
  salesFrequency: SalesFrequency;
  notes: string;
  demandScore: number;
  addedAt: string;
}

export interface YahooAuctionItem {
  auctionId: string;
  title: string;
  currentPrice: number;
  bids: number;
  endTime: string;
  thumbnailUrl: string;
  url: string;
  condition?: "new" | "used";
}

export type DemandLevel = "高" | "中" | "低";

export interface Recommendation {
  name: string;
  modelNumber: string;
  demandLevel: DemandLevel;
  estimatedSellPrice: number;
  purchaseTargetPrice: number;
  reason: string;
  searchKeyword: string;
  tips: string;
}
