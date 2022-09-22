#!/bin/bash

PORT=4000
env PORT=$PORT node . &
SERVER_PID=$!
sleep 1
echo

echo "Getting status"
curl "localhost:$PORT/status"
echo
echo

echo "Posting bad transactions"
curl -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{}'
echo
curl -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{ "instructions": [ { } ] }'
echo
curl -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{ "instructions": [ { "name": "nop" } ] }'
echo
echo

echo "Posting transaction 1"
TXID1=$(curl -s -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{
         "instructions": [
             {
                 "name": "new",
                 "moduleName": "manual/v1/sword.wasm",
                 "className": "Sword",
                 "argList": ["excalibur"]
             },
             {
                 "name": "call",
                 "masterListIndex": 0,
                 "methodName": "sharp",
                 "args": []
             },
             {
                 "name": "lock",
                 "masterListIndex": 0,
                 "lock": "02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a"
             }
         ]
    }' | jq --raw-output .txid)
echo $TXID1
echo

echo "Posting transaction 2"
TXID2=$(curl -s -X POST localhost:$PORT/tx \
   -H 'Content-Type: application/json' \
   -d '{
         "instructions": [
             {
                 "name": "load",
                 "location": "'"$TXID1"'_0"
             },
             {
                 "name": "unlock",
                 "masterListIndex": 0,
                 "key": "02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a"
             },
             {
                 "name": "call",
                 "masterListIndex": 0,
                 "methodName": "sharp",
                 "args": []
             },
             {
                 "name": "lock",
                 "masterListIndex": 0,
                 "lock": "02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a"
             }
         ]
    }' | jq --raw-output .txid)
echo $TXID2
echo

echo "Reading state 1"
curl "localhost:$PORT/state/${TXID1}_0"
echo
echo

echo "Reading state 2"
curl "localhost:$PORT/state/${TXID2}_0"
echo
echo

echo "Reading missing state"
curl "localhost:$PORT/state/${TXID1}_1"
echo
echo

echo "Reading transaction 1"
curl "localhost:$PORT/tx/$TXID1"
echo
echo

echo "Reading transaction 2"
curl "localhost:$PORT/tx/$TXID2"
echo
echo

echo "Reading missing transaction"
curl "localhost:$PORT/tx/abc"
echo
echo

kill $SERVER_PID