# hono-fsr

File system router for the [Hono](https://hono.dev/) web framework.

## Features

- **Zero-Overhead**: All file system operations happen once at initialization. At runtime, the router adds no performance overhead on top of Hono's highly optimized core.
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

> hono-fsr is an **ESM-only** package.

## Usage

### Create Your Routes

Create a `routes` directory and start adding your endpoint files. The file and folder names will map directly to your URL structure.

#### Core Principles

- **HTTP Methods**: To handle a specific HTTP method, export a constant with the method's name in all uppercase (e.g., `export const GET`, `export const POST`).
- **Default Export**: For convenience, a default export will automatically be treated as a GET request.
- **`createRoute()`**: All handlers must be wrapped in the createRoute function. This function can accept multiple arguments, including any Hono middleware (like `zValidator`) followed by your final handler function.

#### Example

```typescript
import { createRoute } from "hono-fsr";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// Default exports are treated as GET methods
export default createRoute((c) => {
  return c.json([
    { id: 1, title: "First Post" },
    { id: 2, title: "Second Post" },
  ]);
});

const postSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

// POST method
export const POST = createRoute(zValidator("json", postSchema), (c) => {
  // c.req.valid("json") is now typed
  const newPost = c.req.valid("json");
  return c.json({ success: true, post: newPost }, 201);
});
```

### Initialize the Router

In your main server file, import `createRouter` and connect it to your Hono app.

#### `/index.ts`

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";

// The function required to initialize the router
import { createRouter } from "hono-fsr";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Hono();

// Initializes the router at ./routes
await createRouter(app, {
  root: path.join(__dirname, "routes"),
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(
      `Server is running on port ${info.port}. (http://localhost:${info.port})`
    );
  }
);
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
| `+middleware.ts`   | (Middleware) | Applies to all routes in its directory and sub-directories. |
| `_filename.ts`     | (Ignored)    | Files that start with an underscore are ignored.            |

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

## Alternatives

For projects that require tight integration between a frontend (React) and backend, or a full-stack experience, consider using [honox](https://github.com/honojs/honox). It is a full meta-framework that also supports file system routing and server-side rendering with React.

hono-fsr is a powerful and lean server-side routing layer. Its sole focus is to provide a robust, convention-driven foundation for organizing your application's endpoints. It remains completely unopinionated about what your handlers return, be it JSON for an API, or HTML from Hono's built-in JSX renderer for a server-rendered site.

## Documentation

This README provides a quickstart and reference for the main features. For detailed guides on all conventions, configuration options, and advanced topics, please visit the [Wiki](https://github.com/itsbrunodev/hono-fsr/wiki).

## License

hono-fsr is under the [MIT](./LICENSE.md) license.
