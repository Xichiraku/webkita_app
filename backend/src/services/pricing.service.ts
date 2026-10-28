import { SupabaseClient } from "@supabase/supabase-js";
import {
  CreatePricingPlanBody,
  PricingPlan,
  PricingPlanWithDetails,
  UpdatePricingPlanBody,
} from "../types/pricing";

/** min wajib angka ≥ 0; max boleh null (tanpa batas atas), jika diisi harus > min */
export function assertPriceRange(min: unknown, max: unknown) {
  if (typeof min !== "number" || !Number.isFinite(min) || min < 0) {
    throw new Error("min_price harus berupa angka 0 atau lebih");
  }
  if (max === null || max === undefined) return;
  if (typeof max !== "number" || !Number.isFinite(max)) {
    throw new Error("max_price harus berupa angka atau null (tanpa batas atas)");
  }
  if (max <= min) throw new Error("max_price harus lebih besar dari min_price");
}

const SELECT_WITH_DETAILS = `
  *,
  features:plan_features(id, feature, sort_order),
  not_included:plan_not_included(id, feature, sort_order)
`;

export class PricingService {
  constructor(private supabase: SupabaseClient) {}

  
  async getAllActive(): Promise<PricingPlanWithDetails[]> {
    const { data, error } = await this.supabase
      .from("pricing_plans")
      .select(SELECT_WITH_DETAILS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return data as PricingPlanWithDetails[];
  }

  // ── Admin: semua plan ─────────────────────────────────
  async getAll(): Promise<PricingPlanWithDetails[]> {
    const { data, error } = await this.supabase
      .from("pricing_plans")
      .select(SELECT_WITH_DETAILS)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return data as PricingPlanWithDetails[];
  }

  // ── Get by ID ─────────────────────────────────────────
  async getById(id: string): Promise<PricingPlanWithDetails> {
    const { data, error } = await this.supabase
      .from("pricing_plans")
      .select(SELECT_WITH_DETAILS)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Plan not found");
    return data as PricingPlanWithDetails;
  }

  // ── Get by Tier ───────────────────────────────────────
  async getByTier(tier: string): Promise<PricingPlanWithDetails> {
    const { data, error } = await this.supabase
      .from("pricing_plans")
      .select(SELECT_WITH_DETAILS)
      .eq("tier", tier)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Plan not found");
    return data as PricingPlanWithDetails;
  }

  // ── Create ────────────────────────────────────────────
  async create(body: CreatePricingPlanBody): Promise<PricingPlanWithDetails> {
    const { features, not_included, ...planData } = body;
    assertPriceRange(planData.min_price, planData.max_price ?? null);

    const { data: plan, error } = await this.supabase
      .from("pricing_plans")
      .insert({ ...planData, max_price: planData.max_price ?? null })
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (features?.length) {
      const { error: e } = await this.supabase
        .from("plan_features")
        .insert(features.map((f, i) => ({
          plan_id: plan.id,
          feature: f.feature,
          sort_order: f.sort_order ?? i,
        })));
      if (e) throw new Error(e.message);
    }

    if (not_included?.length) {
      const { error: e } = await this.supabase
        .from("plan_not_included")
        .insert(not_included.map((f, i) => ({
          plan_id: plan.id,
          feature: f.feature,
          sort_order: f.sort_order ?? i,
        })));
      if (e) throw new Error(e.message);
    }

    return this.getById(plan.id);
  }

  // ── Update ────────────────────────────────────────────
  async update(id: string, body: UpdatePricingPlanBody): Promise<PricingPlanWithDetails> {
    const { features, not_included, ...planData } = body;

    if ("min_price" in planData || "max_price" in planData) {
      const current = await this.getById(id);
      assertPriceRange(
        "min_price" in planData ? planData.min_price : current.min_price,
        "max_price" in planData ? planData.max_price : current.max_price,
      );
    }

    if (Object.keys(planData).length > 0) {
      const { error } = await this.supabase
        .from("pricing_plans")
        .update(planData)
        .eq("id", id);
      if (error) throw new Error(error.message);
    }

    if (features !== undefined) {
      await this.supabase.from("plan_features").delete().eq("plan_id", id);
      if (features.length > 0) {
        const { error } = await this.supabase
          .from("plan_features")
          .insert(features.map((f, i) => ({
            plan_id: id,
            feature: f.feature,
            sort_order: f.sort_order ?? i,
          })));
        if (error) throw new Error(error.message);
      }
    }

    if (not_included !== undefined) {
      await this.supabase.from("plan_not_included").delete().eq("plan_id", id);
      if (not_included.length > 0) {
        const { error } = await this.supabase
          .from("plan_not_included")
          .insert(not_included.map((f, i) => ({
            plan_id: id,
            feature: f.feature,
            sort_order: f.sort_order ?? i,
          })));
        if (error) throw new Error(error.message);
      }
    }

    return this.getById(id);
  }


  async delete(id: string): Promise<{ message: string }> {
    const { error } = await this.supabase
      .from("pricing_plans")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return { message: "Plan deleted successfully" };
  }

  async toggleActive(id: string): Promise<PricingPlan> {
    const plan = await this.getById(id);

    const { data, error } = await this.supabase
      .from("pricing_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as PricingPlan;
  }
}