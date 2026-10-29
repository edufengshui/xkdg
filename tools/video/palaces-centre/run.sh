#!/bin/bash
python3 -m http.server 8765 --directory /home/claude/xkdg >/dev/null 2>&1 &
SP=$!
sleep 1
timeout 300 node "$@"
RC=$?
kill $SP 2>/dev/null
exit $RC
