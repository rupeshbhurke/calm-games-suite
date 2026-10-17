export type Route = { name: 'home' } | { name: 'game'; id: string };

/** Parse a location hash: "" or "#/" is home, "#/game/<id>" is a game. */
export function parseRoute(hash: string): Route {
  const m = /^#\/game\/([a-z0-9-]+)$/.exec(hash);
  return m ? { name: 'game', id: m[1] } : { name: 'home' };
}

export function gameHash(id: string): string {
  return `#/game/${id}`;
}
