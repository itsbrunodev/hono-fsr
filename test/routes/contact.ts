import { createRoute } from "@/index";

export const GET = createRoute((c) => c.text("Contact form"));

export const POST = createRoute((c) => c.json({ message: "Received" }));
