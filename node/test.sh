#!/bin/bash

PORT=4000

echo "Getting status"
curl "localhost:$PORT/status"
echo
echo

echo "Posting tx"
curl -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{"login":"my_login","password":"my_password"}'
echo
echo

echo "Reading state"
curl "localhost:$PORT/state/tx1_0"
echo
echo

echo "Reading missing state"
curl "localhost:$PORT/state/tx1_1"
echo
