#!/bin/sh

# 如果提供了环境变量，则创建一个配置文件
if [ -n "$API_KEY" ] && [ -n "$API_BASE_URL" ]; then
    echo "window.APP_CONFIG = {" > /usr/share/nginx/html/config.js
    echo "  API_KEY: '$API_KEY'," >> /usr/share/nginx/html/config.js
    echo "  API_BASE_URL: '$API_BASE_URL'" >> /usr/share/nginx/html/config.js
    echo "};" >> /usr/share/nginx/html/config.js
    echo "Runtime configuration created with API_KEY: ${API_KEY:0:10}..."
else
    echo "window.APP_CONFIG = {" > /usr/share/nginx/html/config.js
    echo "  API_KEY: 'not-set'," >> /usr/share/nginx/html/config.js
    echo "  API_BASE_URL: 'https://api.ephone.ai'" >> /usr/share/nginx/html/config.js
    echo "};" >> /usr/share/nginx/html/config.js
    echo "No runtime environment variables found, using defaults"
fi

# 启动 nginx
exec "$@"