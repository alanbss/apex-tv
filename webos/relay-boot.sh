#!/bin/sh
# Rooted webOS: copy to /var/lib/webosbrew/init.d/30-apextv-relay (run at boot by Homebrew Channel).
D=/media/developer/apps/usr/palm/applications/com.abs.apextv
pkill -f "$D/relay.js" 2>/dev/null
nohup /usr/bin/node "$D/relay.js" >/tmp/apextv-relay.log 2>&1 </dev/null &
