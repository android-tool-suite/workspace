// Optional development server. The delivered HTML opens without this script.
// Only serves the newly authored preview, not the workspace or other local files.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const preview = new URL('../ui-next-preview.html', import.meta.url);
const server = http.createServer(async (req, res) => {
  if (!['/', '/preview.html'].includes(req.url?.split('?')[0])) {res.writeHead(404);res.end('Not found');return;}
  try {
    const bytes = await readFile(preview);
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(bytes);
  } catch {res.writeHead(500);res.end('Run node docs/ui-next-preview/build.mjs first.');}
});
server.listen(Number(process.env.ATS_PREVIEW_PORT||0), '127.0.0.1', () => console.log(`ATS preview: http://127.0.0.1:${server.address().port}/preview.html`));
