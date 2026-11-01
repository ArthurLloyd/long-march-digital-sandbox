import type { Plugin } from 'vite';
export const PANORAMA_PATH = '/__dev/panorama';
export function panoramaWorkbenchPlugin(): Plugin {
  return {
    name: 'dev-panorama-workbench',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (
          new URL(request.url ?? '/', 'http://localhost').pathname !==
          PANORAMA_PATH
        )
          return next();
        if (!['GET', 'HEAD'].includes(request.method ?? '')) {
          response.statusCode = 405;
          response.end();
          return;
        }
        try {
          const html = await server.transformIndexHtml(
            PANORAMA_PATH,
            '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>长征全景地图 · 成员 C 框架原型</title></head><body><div id="root"></div><script type="module" src="/src/tests/panorama/main.tsx"></script></body></html>',
          );
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch (error) {
          next(error);
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (
          new URL(request.url ?? '/', 'http://localhost').pathname !==
          PANORAMA_PATH
        )
          return next();
        response.statusCode = 404;
        response.end('开发全景原型不在生产预览提供');
      });
    },
  };
}
