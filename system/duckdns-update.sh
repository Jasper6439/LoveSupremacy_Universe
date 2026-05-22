#!/bin/bash
TOKEN=14bf877f-f18d-446a-9522-f4e5c6602504
DOMAIN=lovesupremacy-universe
LOG_FILE=/var/log/duckdns.log

echo "$(date): Updating DuckDNS..." >> $LOG_FILE
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=" 2>&1)
echo "$(date): Response: $RESPONSE" >> $LOG_FILE
