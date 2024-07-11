#! /bin/sh

js_file="/usr/share/nginx/html/static/js/index.js"

sed -i '4,5d' $js_file

sed -i "4i window.DJANGO_API_URL = \"https:\/\/172.29.40.56:3000\/api\";" $js_file
sed -i "5i window.DAPHNE_URL = \"wss:\/\/172.29.40.56:3000\/ws\";" $js_file

exec nginx -g "daemon off;"