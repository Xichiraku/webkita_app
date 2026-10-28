export type Tier = "starter" | "professional" | "business" | "enterprise";

export interface PricingPlan {
  id: string;
  title: string;
  tier: Tier;
  min_price: number;
  /** null = paket tanpa batas atas (ditampilkan "Mulai Rp …") */
  max_price: number | null;
  price_range: string;
  timeline?: string;
  badge?: string;
  upgrade_note?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature: string;
  sort_order: number;
}

export interface PricingPlanWithDetails extends PricingPlan {
  features: PlanFeature[];
  not_included: PlanFeature[];
}

export interface FeatureBody {
  feature: string;
  sort_order?: number;
}

export interface CreatePricingPlanBody {
  title: string;
  tier: Tier;
  min_price: number;
  max_price: number | null;
  price_range: string;
  timeline?: string;
  badge?: string;
  upgrade_note?: string;
  is_active?: boolean;
  sort_order?: number;
  features?: FeatureBody[];
  not_included?: FeatureBody[];
}

export interface UpdatePricingPlanBody extends Partial<CreatePricingPlanBody> {}