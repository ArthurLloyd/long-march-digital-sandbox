import type { Plugin } from 'vite';

export const CONTRACT_WORKBENCH_PATH = '/__dev/contracts';
export function assertProductionModules(moduleIds: readonly string[]) {
  const forbidden = moduleIds.filter((id) =>
    /\/src\/(?:data\/fixtures|tests|app\/panorama|features\/history\/review)\//.test(
      id.replaceAll('\\', '/'),
    ),
  );
  if (forbidden.length)
    throw new Error(`生产构建包含隔离测试模块：${forbidden.join(', ')}`);
}
export function productionIsolationPlugin(): Plugin {
  return {
    name: 'production-contract-isolation',
    apply: 'build',
    transform(_code, id) {
      assertProductionModules([id]);
      return null;
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk')
          assertProductionModules(Object.keys(output.modules));
      }
    },
  };
}
export function contractWorkbenchPlugin(): Plugin {
  return {
    name: 'dev-contract-workbench',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost')
          .pathname;
        if (pathname !== CONTRACT_WORKBENCH_PATH) return next();
        if (!['GET', 'HEAD'].includes(request.method ?? '')) {
          response.statusCode = 405;
          response.end();
          return;
        }
        try {
          const html = await server.transformIndexHtml(
            CONTRACT_WORKBENCH_PATH,
            `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>C0 隔离接口工作台</title></head><body><div id="root"></div><script type="module" src="/src/tests/workbench/main.tsx"></script></body></html>`,
          );
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
