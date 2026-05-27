import app from "./app";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runStartupMigrations() {
  const [old] = await db.select().from(usersTable).where(eq(usersTable.email, "Bigsid84@gmail.com"));
  if (old) {
    await db.update(usersTable)
      .set({
        email: "bidwrenx@gmail.com",
        passwordHash: "e420ac31a14bbd2916d7446c354352ffb1ff816ab23034f14594acb3002d38be",
        mustChangePassword: true,
        isAdmin: true,
      })
      .where(eq(usersTable.id, old.id));
    logger.info({ userId: old.id }, "Admin account migrated to bidwrenx@gmail.com");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await runStartupMigrations();
  } catch (e) {
    logger.error({ err: e }, "Startup migration failed");
  }
});
