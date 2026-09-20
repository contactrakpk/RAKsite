import test from 'node:test';
import assert from 'node:assert/strict';

const { app } = await import('../server.js');

test('admin product delete API route is available', () => {
  const routes = [];
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      routes.push(`${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
    }
  });

  assert(routes.some((route) => route.includes('DELETE /api/admin/products/')));
});
