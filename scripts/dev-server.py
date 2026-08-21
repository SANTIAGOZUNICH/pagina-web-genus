import http.server
import mimetypes

mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')


class UTF8Handler(http.server.SimpleHTTPRequestHandler):
    # El servidor de prueba estándar de Python sirve .html sin declarar
    # charset en el header Content-Type. El archivo SÍ está en UTF-8 (el
    # <meta charset="utf-8"> es correcto), pero sin el header algunos
    # navegadores lo adivinan mal y muestran acentos rotos (mojibake).
    # Esto solo pasa en este servidor local de prueba — Vercel en
    # producción ya envía el charset correcto automáticamente.
    def guess_type(self, path):
        ctype = super().guess_type(path)
        if isinstance(ctype, tuple):
            ctype = ctype[0]
        if ctype in ('text/html', 'text/css', 'application/javascript', 'text/javascript'):
            return ctype + '; charset=utf-8'
        return ctype


http.server.test(HandlerClass=UTF8Handler, port=5500)
