> [!NOTE]
> This package is currently in an alpha stage. While the core functionality is in place, the API may be subject to breaking changes as it matures. Please use with caution and feel free to report any issues.

# hono-fsr

File-system router for the [Hono](https://hono.dev/) web framework.

## Features

- **Zero-Overhead**: All file-system operations happen once at initialization. At runtime, the router adds no performance overhead on top of Hono's highly optimized core.
- **Convention-based Routing**: Intuitive file and folder naming conventions for static, dynamic, catch-all, and optional routes.
- **Advanced Features**: Built-in support for route groups, nested middleware, path prefixing (basePath), and trailing slash control.

## Installation

```bash
# npm
npm install hono-fsr
# yarn
yarn add hono-fsr
# pnpm
pnpm add hono-fsr
# bun
bun add hono-fsr
```

> hono-fsr is an _ESM-only package_.

## Usage

### 1. Create Your Routes

Create a `routes` directory and start adding your endpoint files. The file and folder names will map directly to your URL structure.

#### `routes/index.ts`

```typescript
import { createRoute } from "hono-fsr";

export const GET = createRoute((c) => {
  return c.text("Hello, World!");
});
```

#### `routes/users/[id].ts`

```typescript
import { createRoute } from "hono-fsr";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const GET = createRoute(
  zValidator("param", z.object({ id: z.string().regex(/^\d+$/) })),
  (c) => {
    // c.req.valid('param') is fully typed!
    const { id } = c.req.valid("param");
    return c.json({ userId: id });
  }
);
```

### 2. Initialize the Router

In your main server file, import `createRouter` and connect it to your Hono app.

#### `index.ts`

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createRouter } from "hono-fsr";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Hono();
const port = 3000;

// initialize the router
await createRouter(app, {
  root: path.join(__dirname, "routes"),
});

console.log(`Server is running on port ${port}. (http://localhost:${port})`);

serve({
  fetch: app.fetch,
  port,
});
```

## Routing Conventions

hono-fsr uses a simple and powerful file-naming convention.

| File Name          | URL Path     | Example                                                     |
| ------------------ | ------------ | ----------------------------------------------------------- |
| `index.ts`         | `/`          | `routes/index.ts` → `/`                                     |
| `users.ts`         | `/users`     | `routes/users.ts` → `/users`                                |
| `users/index.ts`   | `/users`     | `routes/users/index.ts` → `/users`                          |
| `[id].ts`          | `/:id`       | `routes/users/[id].ts` → `/users/:id`                       |
| `[[id]].ts`        | `/:id?`      | `routes/optional/[[id]].ts` → `/optional/:id?`              |
| `[...path].ts`     | `/*`         | `routes/files/[...path].ts` → `/files/*`                    |
| `(group)/about.ts` | `/about`     | `routes/(marketing)/about.ts` → `/about`                    |
| `_middleware.ts`   | (Middleware) | Applies to all routes in its directory and sub-directories. |

## Configuration

The `createRouter` function accepts an options object to customize its behavior.

| Option          | Description                                         | Type                                | Default      |
| --------------- | --------------------------------------------------- | ----------------------------------- | ------------ |
| `root`          | The root directory of the routes.                   | `string`                            | **Required** |
| `debug`         | Enable verbose logging for debugging.               | `boolean`                           | `false`      |
| `basePath`      | A path prefix for all routes.                       | `string`                            | `/`          |
| `trailingSlash` | Defines the trailing slash behavior for all routes. | `"always" \| "never" \| "preserve"` | `"preserve"` |

### Example Configuration

```typescript
createRouter(app, {
  root: path.join(__dirname, "routes"),
  debug: process.env.NODE_ENV !== "production",
  basePath: "/api/v1",
  trailingSlash: "never",
});
```

## License

hono-fsr is under the [MIT](./LICENSE.md) license.
