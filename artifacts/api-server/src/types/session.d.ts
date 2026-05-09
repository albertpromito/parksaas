import "express-session";

declare module "express-session" {
  interface SessionData {
    role: "admin" | "tenant";
    tenantId: number | null;
    tenantEmail: string | null;
    tenantName: string | null;
    parkingName: string | null;
  }
}
