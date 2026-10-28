#!/usr/bin/env bash
# Endurecimiento de Nginx para streamfusion.top (aaPanel).
# Ejecutar en el VPS como root:  bash vps-nginx-hardening.sh
#
# Qué hace:
#  - TLS solo 1.2/1.3 y cifrados modernos (quita TLS 1.1 y 3DES)
#  - Cabeceras de seguridad (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy)
#  - /assets/ en caché 1 año (los nombres llevan hash) y 404 real si falta un archivo
#  - index.html siempre se revalida (las actualizaciones llegan al momento)
#  - Límite de 60 peticiones/min por IP a activar.php (anti fuerza bruta de licencias)
# Si `nginx -t` falla, restaura la configuración anterior automáticamente.
set -e
CONF=/www/server/panel/vhost/nginx/streamfusion.top.conf
ZONE=/www/server/panel/vhost/nginx/0.sf_ratelimit.conf
BACKUP=/root/backups-streamfusion/streamfusion.top.conf-$(date +%Y%m%d-%H%M)

mkdir -p /root/backups-streamfusion
cp -a "$CONF" "$BACKUP"
echo "Copia guardada en $BACKUP"

cat > "$ZONE" <<'EOF'
# StreamFusion: límite de peticiones al endpoint de licencias (anti fuerza bruta)
limit_req_zone $binary_remote_addr zone=sf_lic:10m rate=60r/m;
EOF

python3 - "$CONF" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()

def rep(a, b):
    global s
    if a not in s:
        sys.exit("No encontrado (¿ya aplicado?): " + a[:60])
    s = s.replace(a, b, 1)

rep("ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;", "ssl_protocols TLSv1.2 TLSv1.3;")
rep(
    "ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;",
    "ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;",
)
rep(
    'add_header Strict-Transport-Security "max-age=31536000";',
    '''add_header Strict-Transport-Security "max-age=31536000";
        # --- StreamFusion: cabeceras de seguridad ---
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;''',
)
rep(
    '''    location / {
    try_files $uri $uri/ /index.html;
   }''',
    '''    # --- StreamFusion: /assets/ lleva hash en el nombre, caché de 1 año.
    location ^~ /assets/ {
        try_files $uri =404;
        expires 1y;
        access_log off;
    }

    # index.html siempre se revalida
    location = /index.html {
        expires -1;
    }

    location / {
    try_files $uri $uri/ /index.html;
   }''',
)
rep(
    "    location = /_lic-sf_c0j6v1v8/activar.php {",
    '''    location = /_lic-sf_c0j6v1v8/activar.php {
        limit_req zone=sf_lic burst=40 nodelay;
        limit_req_status 429;''',
)
open(p, "w").write(s)
PY

if nginx -t; then
  nginx -s reload
  echo "OK: configuración aplicada y Nginx recargado."
else
  echo "ERROR en la configuración. Restaurando la copia..."
  cp -a "$BACKUP" "$CONF"
  rm -f "$ZONE"
  nginx -t && nginx -s reload
  exit 1
fi
