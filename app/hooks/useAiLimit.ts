"use client";

import { useState, useCallback } from "react";

// 1日あたりのAI呼び出し上限回数
export const AI_DAILY_LIMIT = 20;
const STORAGE_KEY = "ai_daily_v1";

interface LimitData {
  date: string;
  count: number;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function readData(): LimitData {
  if (typeof window === "undefined") return { date: getToday(), count: 0 };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { date: getToday(), count: 0 };
    const data: LimitData = JSON.parse(stored);
    // 日付が変わっていたらリセット
    if (data.date !== getToday()) return { date: getToday(), count: 0 };
    return data;
  } catch {
    return { date: getToday(), count: 0 };
  }
}

function writeData(data: LimitData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useAiLimit() {
  const [count, setCount] = useState(() => readData().count);

  const remaining = Math.max(0, AI_DAILY_LIMIT - count);
  const canCall = count < AI_DAILY_LIMIT;

  // AI呼び出し前に consume() を呼ぶ。上限超えたら false を返す
  const consume = useCallback((): boolean => {
    const data = readData();
    if (data.count >= AI_DAILY_LIMIT) return false;
    const newData = { date: getToday(), count: data.count + 1 };
    writeData(newData);
    setCount(newData.count);
    return true;
  }, []);

  return { canCall, remaining, limit: AI_DAILY_LIMIT, consume };
}
