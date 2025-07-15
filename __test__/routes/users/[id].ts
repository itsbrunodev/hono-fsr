import { createRoute } from "@/index";

export const GET = createRoute((c) => c.json({ userId: c.req.param("id") }));
