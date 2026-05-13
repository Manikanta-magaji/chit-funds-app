#!/bin/sh
set -e

# Inject runtime configuration into the SPA
cat > /usr/share/nginx/html/config.js <<EOF
window.RUNTIME_CONFIG = {
  API_BASE_URL: '${API_BASE_URL:-/api}'
};
EOF

echo "Runtime config injected:"
cat /usr/share/nginx/html/config.js

exec "$@"
