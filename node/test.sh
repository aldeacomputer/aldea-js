#!/bin/bash

PORT=4000
node . &
serverPID=$!
sleep 0.5
echo

echo "Getting status"
curl "localhost:$PORT/status"
echo
echo

echo "Posting tx"
curl -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{
         "instructions": [
             {
                 "name": "new",
                 "className": "v1/sword.wasm",
                 "argList": ["excalibur"]
             },
             {
                 "name": "lock",
                 "jigIndex": 0,
                 "lock": "02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a"
             }
         ]
    }'
echo
echo

echo "Reading state"
curl "localhost:$PORT/state/tx1_0"
echo
echo

echo "Reading missing state"
curl "localhost:$PORT/state/tx1_1"
echo

kill $!