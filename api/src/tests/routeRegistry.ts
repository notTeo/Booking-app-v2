import { createRequire } from 'module';
import { authenticate } from '../middleware/authenticate';

// Lists every route the app registers, with its full path, so a test can
// insist that each one is accounted for. Express 5 keeps a mount path only
// inside a compiled matcher, so instead of reading the router stack this
// records `Router.use` / `Router.route` calls while the app module loads.
// `loadApp()` must therefore be the first thing that imports '../app'.

export interface RegisteredRoute {
  method: string; // upper-case
  path: string; // full path, e.g. /api/shops/:shopId/team/:memberId
  authenticated: boolean;
}

type AnyFn = (...args: unknown[]) => unknown;
interface RouterLike {
  stack: unknown[];
}
interface RouteRecord {
  path: string;
  methods: string[];
  handlers: unknown[];
}
interface Node {
  routes: RouteRecord[];
  mounts: { path: string; child: RouterLike }[];
  // `router.use(authenticate)` — everything registered on it is authenticated.
  authAll: boolean;
}

const nodes = new Map<RouterLike, Node>();
const node = (r: RouterLike): Node => {
  let n = nodes.get(r);
  if (!n) nodes.set(r, (n = { routes: [], mounts: [], authAll: false }));
  return n;
};

const isRouter = (x: unknown): x is RouterLike =>
  typeof x === 'function' && Array.isArray((x as unknown as RouterLike).stack);

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  const requireFromExpress = createRequire(require.resolve('express'));
  const proto = (
    requireFromExpress('router') as { prototype: Record<string, AnyFn> }
  ).prototype;

  const origRoute = proto['route'];
  proto['route'] = function (this: RouterLike, path: string) {
    const route = origRoute.call(this, path) as {
      methods: Record<string, boolean>;
      stack: { handle: unknown }[];
    };
    const record: RouteRecord = { path, methods: [], handlers: [] };
    node(this).routes.push(record);
    // Methods and handlers are added to the route after this returns, so
    // resolve them lazily.
    Object.defineProperty(record, 'methods', {
      get: () => Object.keys(route.methods).filter((m) => route.methods[m]),
    });
    Object.defineProperty(record, 'handlers', {
      get: () => route.stack.map((l) => l.handle),
    });
    return route;
  };

  const origUse = proto['use'];
  proto['use'] = function (this: RouterLike, ...args: unknown[]) {
    const [first, ...rest] = args;
    const path = typeof first === 'string' ? first : '';
    const fns = (typeof first === 'string' ? rest : args).flat(Infinity);
    if (fns.includes(authenticate) && path === '') node(this).authAll = true;
    for (const fn of fns)
      if (isRouter(fn)) node(this).mounts.push({ path, child: fn });
    return origUse.apply(this, args);
  };
}

export async function loadApp() {
  install();
  const { default: app } = await import('../app');
  const root = (app as unknown as { router: RouterLike }).router;

  const out: RegisteredRoute[] = [];
  const walk = (r: RouterLike, prefix: string, authed: boolean) => {
    const n = node(r);
    const auth = authed || n.authAll;
    for (const rt of n.routes)
      for (const method of rt.methods)
        out.push({
          method: method.toUpperCase(),
          path: (prefix + rt.path).replace(/\/+$/, '') || '/',
          authenticated: auth || rt.handlers.includes(authenticate),
        });
    for (const m of n.mounts) walk(m.child, prefix + m.path, auth);
  };
  walk(root, '', false);
  return { app, routes: out };
}
