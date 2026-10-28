import { Hono } from "hono";
import { PricingService } from "../services/pricing.service";
import { CreatePricingPlanBody, UpdatePricingPlanBody } from "../types/pricing";
import { createSupabase } from "../lib/supabase";
import { authMiddleware, roleMiddleware } from "../middleware/auth.middleware";

const requireAdmin = [authMiddleware, roleMiddleware("admin", "developer")] as const;

type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const pricing = new Hono<{ Bindings: Env }>();

const getService = (c: any) => {
  const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  return new PricingService(supabase);
};

const ok  = (c: any, data: unknown, status = 200) => c.json({ success: true, data }, status);
const err = (c: any, message: string, status = 500) => c.json({ success: false, message }, status);

// ── PUBLIC ────────────────────────────────────────────────────────
pricing.get("/public", async (c) => {
  try {
    return ok(c, await getService(c).getAllActive());
  } catch (e: any) {
    return err(c, e.message);
  }
});

pricing.get("/public/tier/:tier", async (c) => {
  try {
    return ok(c, await getService(c).getByTier(c.req.param("tier")));
  } catch (e: any) {
    return err(c, e.message, 404);
  }
});

// ── ADMIN CRUD (butuh login sebagai admin/developer) ───────────────
pricing.get("/", ...requireAdmin, async (c) => {
  try {
    return ok(c, await getService(c).getAll());
  } catch (e: any) {
    return err(c, e.message);
  }
});

pricing.get("/:id", ...requireAdmin, async (c) => {
  try {
    return ok(c, await getService(c).getById(c.req.param("id") as string));
  } catch (e: any) {
    return err(c, e.message, 404);
  }
});

pricing.post("/", ...requireAdmin, async (c) => {
  try {
    const body = await c.req.json<CreatePricingPlanBody>();
    const { title, tier, min_price, price_range } = body;

    // max_price boleh kosong/null = paket tanpa batas atas
    if (!title || !tier || min_price === undefined || min_price === null || !price_range) {
      return err(c, "title, tier, min_price, price_range wajib diisi", 400);
    }

    return ok(c, await getService(c).create(body), 201);
  } catch (e: any) {
    return err(c, e.message, /harus|wajib/.test(e.message) ? 400 : 500);
  }
});

pricing.put("/:id", ...requireAdmin, async (c) => {
  try {
    const body = await c.req.json<UpdatePricingPlanBody>();
    return ok(c, await getService(c).update(c.req.param("id") as string, body));
  } catch (e: any) {
    return err(c, e.message, /harus|wajib/.test(e.message) ? 400 : 500);
  }
});

pricing.delete("/:id", ...requireAdmin, async (c) => {
  try {
    return ok(c, await getService(c).delete(c.req.param("id") as string));
  } catch (e: any) {
    return err(c, e.message);
  }
});

pricing.patch("/:id/toggle-active", ...requireAdmin, async (c) => {
  try {
    return ok(c, await getService(c).toggleActive(c.req.param("id") as string));
  } catch (e: any) {
    return err(c, e.message);
  }
});

export const pricingRoute = pricing;