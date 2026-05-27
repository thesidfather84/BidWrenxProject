import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser, getPublicName } from "./auth";

const router = Router();

router.get("/mechanics/map", async (req, res): Promise<void> => {
  try {
    const mechanics = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "mechanic"),
          eq(usersTable.mapVisible, true),
          eq(usersTable.banned, false),
          eq(usersTable.suspended, false),
          isNotNull(usersTable.mapLat),
          isNotNull(usersTable.mapLng),
        )
      );

    const result = mechanics.map((m: typeof usersTable.$inferSelect) => ({
      id: m.id,
      name: getPublicName(m),
      photoUrl: m.photoUrl ?? null,
      rating: m.rating ?? null,
      reviewCount: m.reviewCount,
      adminVerifiedMechanic: m.adminVerifiedMechanic,
      specialties: m.specialties ?? null,
      bio: m.bio ?? null,
      mapLat: m.mapLat!,
      mapLng: m.mapLng!,
      mapCity: m.mapCity ?? null,
      mapState: m.mapState ?? null,
      serviceRadiusMiles: m.serviceRadiusMiles,
      isMobileMechanic: m.isMobileMechanic,
      shopType: m.shopType,
      emergencyAvailable: m.emergencyAvailable,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get mechanics map");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/users/me/map-settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!currentUser) { res.status(404).json({ error: "User not found" }); return; }
  if (currentUser.role !== "mechanic") {
    res.status(403).json({ error: "Only mechanics can update map settings" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (body.serviceRadiusMiles !== undefined) {
    const v = Number(body.serviceRadiusMiles);
    if (!Number.isInteger(v) || v < 1 || v > 200) { res.status(400).json({ error: "serviceRadiusMiles must be 1–200" }); return; }
    updates.serviceRadiusMiles = v;
  }
  if (body.willingToTravelMiles !== undefined) {
    if (body.willingToTravelMiles === null) {
      updates.willingToTravelMiles = null;
    } else {
      const v = Number(body.willingToTravelMiles);
      if (!Number.isInteger(v) || v < 0 || v > 500) { res.status(400).json({ error: "willingToTravelMiles must be 0–500" }); return; }
      updates.willingToTravelMiles = v;
    }
  }
  if (body.isMobileMechanic !== undefined) {
    if (typeof body.isMobileMechanic !== "boolean") { res.status(400).json({ error: "isMobileMechanic must be boolean" }); return; }
    updates.isMobileMechanic = body.isMobileMechanic;
  }
  if (body.shopType !== undefined) {
    if (!["shop", "mobile", "both"].includes(body.shopType as string)) { res.status(400).json({ error: "Invalid shopType" }); return; }
    updates.shopType = body.shopType as "shop" | "mobile" | "both";
  }
  if (body.emergencyAvailable !== undefined) {
    if (typeof body.emergencyAvailable !== "boolean") { res.status(400).json({ error: "emergencyAvailable must be boolean" }); return; }
    updates.emergencyAvailable = body.emergencyAvailable;
  }
  if (body.mapVisible !== undefined) {
    if (typeof body.mapVisible !== "boolean") { res.status(400).json({ error: "mapVisible must be boolean" }); return; }
    updates.mapVisible = body.mapVisible;
  }

  const cityChanged = "mapCity" in body;
  const stateChanged = "mapState" in body;

  if (cityChanged) {
    const v = body.mapCity;
    if (v !== null && (typeof v !== "string" || v.length > 100)) { res.status(400).json({ error: "Invalid mapCity" }); return; }
    // Explicitly assign null to clear, or the string value — never coerce null → undefined
    updates.mapCity = v as string | null;
  }
  if (stateChanged) {
    const v = body.mapState;
    if (v !== null && (typeof v !== "string" || v.length > 50)) { res.status(400).json({ error: "Invalid mapState" }); return; }
    updates.mapState = v as string | null;
  }

  if (cityChanged || stateChanged) {
    const city = (body.mapCity as string | null | undefined) ?? currentUser.mapCity ?? null;
    const state = (body.mapState as string | null | undefined) ?? currentUser.mapState ?? null;
    if (city || state) {
      try {
        const query = [city, state].filter(Boolean).join(", ");
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`,
          { headers: { "User-Agent": "BidWrenx/1.0 (contact@bidwrenx.com)" } }
        );
        const geoData = await geoRes.json() as Array<{ lat: string; lon: string }>;
        if (geoData.length > 0) {
          updates.mapLat = parseFloat(geoData[0].lat);
          updates.mapLng = parseFloat(geoData[0].lon);
        }
      } catch (err) {
        req.log.warn({ err }, "Geocoding failed, lat/lng not updated");
      }
    } else {
      // Both city and state cleared — explicitly null out coordinates
      updates.mapLat = null;
      updates.mapLng = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.json(formatUser(currentUser));
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(updated));
});

export default router;
