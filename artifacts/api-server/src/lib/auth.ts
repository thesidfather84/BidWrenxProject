import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "bidwrenx_salt").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function hashPin(pin: string, email: string): string {
  return crypto.createHash("sha256").update(pin + email + "bidwrenx_pin_salt").digest("hex");
}

export function generateToken(userId: number, role: string, sessionType: "full" | "pin" = "full"): string {
  const payload = `${userId}:${role}:${Date.now()}:${sessionType}`;
  const sig = crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "bidwrenx_secret").update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifyToken(token: string): { userId: number; role: string; sessionType: "full" | "pin" } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(":");

    if (parts.length === 4) {
      // Legacy format: userId:role:timestamp:sig
      const [userIdStr, role, , sig] = parts;
      const payload = parts.slice(0, 3).join(":");
      const expectedSig = crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "bidwrenx_secret").update(payload).digest("hex");
      if (sig !== expectedSig) return null;
      return { userId: parseInt(userIdStr, 10), role, sessionType: "full" };
    } else if (parts.length === 5) {
      // New format: userId:role:timestamp:sessionType:sig
      const [userIdStr, role, , sessionType, sig] = parts;
      const payload = parts.slice(0, 4).join(":");
      const expectedSig = crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "bidwrenx_secret").update(payload).digest("hex");
      if (sig !== expectedSig) return null;
      return { userId: parseInt(userIdStr, 10), role, sessionType: sessionType as "full" | "pin" };
    }

    return null;
  } catch {
    return null;
  }
}
