import http.server
import mimetypes

mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')

http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=5500)
