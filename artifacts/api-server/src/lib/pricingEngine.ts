import { db, pricingRulesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

export type FormattedRule = {
  id: number;
  name: string;
  vehicleTypes: string[];
  rateType: string;
  rateValue: number;
  blockMinutes: number | null;
  gracePeriodMinutes: number;
  minimumMinutes: number;
  minimumCharge: number | null;
  maxDailyCharge: number | null;
  roundUpBlock: boolean;
  timeFrom: string | null;
  timeTo: string | null;
  daysOfWeek: number[] | null;
  priority: number;
  isActive: boolean;
};

export function formatRule(r: typeof pricingRulesTable.$inferSelect): FormattedRule {
  return {
    ...r,
    rateValue: parseFloat(r.rateValue),
    minimumCharge: r.minimumCharge !== null ? parseFloat(r.minimumCharge) : null,
    maxDailyCharge: r.maxDailyCharge !== null ? parseFloat(r.maxDailyCharge) : null,
  };
}

export function calculatePrice(rule: FormattedRule, durationMinutes: number): number {
  const billable = Math.max(0, durationMinutes - rule.gracePeriodMinutes);
  if (billable === 0) return 0;

  const effective = Math.max(billable, rule.minimumMinutes);
  let price = 0;

  if (rule.rateType === "per_minute") {
    price = effective * rule.rateValue;
  } else if (rule.rateType === "hourly") {
    let hours = effective / 60;
    if (rule.roundUpBlock) hours = Math.ceil(hours);
    price = hours * rule.rateValue;
  } else if (rule.rateType === "per_block") {
    const blockMin = rule.blockMinutes ?? 60;
    let blocks = effective / blockMin;
    if (rule.roundUpBlock) blocks = Math.ceil(blocks);
    price = blocks * rule.rateValue;
  }

  if (rule.minimumCharge !== null && price < rule.minimumCharge) {
    price = rule.minimumCharge;
  }
  if (rule.maxDailyCharge !== null && price > rule.maxDailyCharge) {
    price = rule.maxDailyCharge;
  }

  return Math.round(price * 100) / 100;
}

export function matchesRule(rule: FormattedRule, vehicleType: string, entryTime: Date): boolean {
  if (!rule.isActive) return false;
  if (!rule.vehicleTypes.includes(vehicleType)) return false;

  const day = entryTime.getDay();
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(day)) return false;

  if (rule.timeFrom || rule.timeTo) {
    const hhmm = `${String(entryTime.getHours()).padStart(2, "0")}:${String(entryTime.getMinutes()).padStart(2, "0")}`;
    const from = rule.timeFrom;
    const to = rule.timeTo;

    // Handle overnight ranges (e.g. 22:00 to 06:00)
    if (from && to && from > to) {
      if (hhmm < from && hhmm > to) return false;
    } else {
      if (from && hhmm < from) return false;
      if (to && hhmm > to) return false;
    }
  }

  return true;
}

export async function computePrice(
  vehicleType: string,
  entryTime: Date,
  exitTime: Date,
): Promise<{
  amount: number;
  durationMinutes: number;
  matchedRule: { id: number; name: string } | null;
  allMatchingRules: Array<{ id: number; name: string; amount: number }>;
}> {
  const durationMinutes = Math.max(0, Math.round((exitTime.getTime() - entryTime.getTime()) / 60000));
  const allRules = await db.select().from(pricingRulesTable).orderBy(desc(pricingRulesTable.priority));
  const formatted = allRules.map(formatRule);
  const matching = formatted.filter((r) => matchesRule(r, vehicleType, entryTime));
  const rule = matching[0] ?? null;
  const amount = rule ? calculatePrice(rule, durationMinutes) : 0;

  return {
    amount,
    durationMinutes,
    matchedRule: rule ? { id: rule.id, name: rule.name } : null,
    allMatchingRules: matching.map((r) => ({
      id: r.id,
      name: r.name,
      amount: calculatePrice(r, durationMinutes),
    })),
  };
}
