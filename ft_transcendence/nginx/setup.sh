#! /bin/sh

js_file="/usr/share/nginx/html/static/js/index.js"

sed -i '4,5d' $js_file

sed -i "4i window.DJANGO_API_URL = \"https:\/\/$BEYONGPONG_COM:3000\/api\";" $js_file
sed -i "5i window.DAPHNE_URL = \"wss:\/\/$BEYONGPONG_COM:3000\/ws\";" $js_file

exec nginx -g "daemon off;"