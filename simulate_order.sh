#!/bin/bash
# Simulasi full order ZasaGo: customer buat order → mitra accept → delivered → completed

BASE="http://localhost:8000/api"
SEP="────────────────────────────────────────"
JSON='-H "Content-Type: application/json" -H "Accept: application/json"'

ok()  { echo "✅ $1"; }
err() { echo "❌ $1"; exit 1; }
hdr() { echo ""; echo "$SEP"; echo "  $1"; echo "$SEP"; }
jq()  { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null; }

CURL="curl -s -H 'Accept: application/json'"

# ─── 1. Login customer ────────────────────────────────────────────────────────
hdr "1. Login Customer (pelanggan@zasaqu.com)"
RESP=$(curl -s -H "Accept: application/json" -H "Content-Type: application/json" \
  -X POST "$BASE/auth/login" -d '{"email":"pelanggan@zasaqu.com","password":"password123"}')
CTOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
CNAME=$(echo "$RESP"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('name',''))" 2>/dev/null)
[ -z "$CTOKEN" ] && err "Login customer gagal: $RESP"
ok "Login sebagai '$CNAME'"

# ─── 2. Estimasi ongkir ───────────────────────────────────────────────────────
hdr "2. Estimasi Ongkir"
EST=$(curl -s -H "Accept: application/json" -H "Authorization: Bearer $CTOKEN" \
  "$BASE/shipping/estimate?pickup_lat=-6.9175&pickup_lng=107.6191&dropoff_lat=-6.9300&dropoff_lng=107.6350&vehicle_type=motor")
FEE=$(echo "$EST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('fee', d.get('data',{}).get('fee', 5000)))" 2>/dev/null)
[ -z "$FEE" ] && FEE=5000
ok "Ongkir estimasi: Rp $FEE"

# ─── 3. Buat order ────────────────────────────────────────────────────────────
hdr "3. Buat Order (payment: wallet)"
ORDER_RESP=$(curl -s -H "Accept: application/json" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CTOKEN" \
  -X POST "$BASE/orders" -d "{
    \"pickup_address\": \"Jl. Asia Afrika No.1, Bandung\",
    \"pickup_lat\": -6.9175,
    \"pickup_lng\": 107.6191,
    \"dropoff_address\": \"Jl. Merdeka No.5, Bandung\",
    \"dropoff_lat\": -6.9300,
    \"dropoff_lng\": 107.6350,
    \"item_category_id\": 1,
    \"item_description\": \"Dokumen penting simulasi\",
    \"item_value\": 50000,
    \"vehicle_type\": \"motor\",
    \"shipping_fee\": $FEE,
    \"payment_method\": \"wallet\",
    \"notes\": \"Test simulasi order ZasaGo\"
  }")
ORDER_ID=$(echo "$ORDER_RESP"     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
ORDER_NUM=$(echo "$ORDER_RESP"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('order_number',''))" 2>/dev/null)
ORDER_STATUS=$(echo "$ORDER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('status',''))" 2>/dev/null)
[ -z "$ORDER_ID" ] && err "Buat order gagal: $ORDER_RESP"
ok "Order dibuat: #$ORDER_NUM (ID: $ORDER_ID) — status: $ORDER_STATUS"

# ─── 4. Login mitra ───────────────────────────────────────────────────────────
hdr "4. Login Mitra (dadang@zasaqu.com)"
RESP2=$(curl -s -H "Accept: application/json" -H "Content-Type: application/json" \
  -X POST "$BASE/auth/login" -d '{"email":"dadang@zasaqu.com","password":"password123"}')
MTOKEN=$(echo "$RESP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
MNAME=$(echo "$RESP2"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('name',''))" 2>/dev/null)
[ -z "$MTOKEN" ] && err "Login mitra gagal: $RESP2"
ok "Login sebagai '$MNAME'"

# ─── 5. Mitra cek order tersedia ─────────────────────────────────────────────
hdr "5. Mitra Cek Order Tersedia"
AVAIL=$(curl -s -H "Accept: application/json" -H "Authorization: Bearer $MTOKEN" \
  "$BASE/mitra/orders/available")
AVAIL_COUNT=$(echo "$AVAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('data',[]); print(len(items))" 2>/dev/null)
ok "Order tersedia untuk mitra: $AVAIL_COUNT"

# ─── 6. Mitra accept order ────────────────────────────────────────────────────
hdr "6. Mitra Accept Order #$ORDER_NUM"
ACC=$(curl -s -H "Accept: application/json" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MTOKEN" \
  -X POST "$BASE/mitra/orders/$ORDER_ID/accept")
ACC_MSG=$(echo "$ACC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', str(d)[:80]))" 2>/dev/null)
echo "   $ACC_MSG"
if echo "$ACC" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('message','') else 1)" 2>/dev/null; then
  ok "Mitra berhasil accept order"
else
  echo "   ⚠ Cek respons di atas"
fi

do_status() {
  local STEP="$1" STATUS="$2"
  hdr "$STEP Status → $STATUS"
  sleep 1
  R=$(curl -s -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MTOKEN" \
    -X PATCH "$BASE/mitra/orders/$ORDER_ID/status" \
    -d "{\"status\":\"$STATUS\"}")
  MSG=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', str(d)[:80]))" 2>/dev/null)
  if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(1 if 'error' in str(d).lower() or 'tidak bisa' in str(d).lower() else 0)" 2>/dev/null; then
    ok "$MSG"
  else
    echo "   ⚠ $MSG"
  fi
}

do_status "7."  "on_pickup"
do_status "8."  "picked_up"
do_status "9."  "on_delivery"
do_status "10." "delivered"
do_status "11." "completed"

# ─── 12. Verifikasi ───────────────────────────────────────────────────────────
hdr "12. Verifikasi Final (dari sisi customer)"
FINAL=$(curl -s -H "Accept: application/json" -H "Authorization: Bearer $CTOKEN" \
  "$BASE/orders/$ORDER_ID")
FINAL_STATUS=$(echo "$FINAL"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null)
PAY_STATUS=$(echo "$FINAL"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment_status','unknown'))" 2>/dev/null)
MITRA_NAME=$(echo "$FINAL"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('mitra',{}).get('name','?') if d.get('mitra') else '?')" 2>/dev/null)

echo ""
echo "  Order #$ORDER_NUM"
echo "  Status       : $FINAL_STATUS"
echo "  Payment      : $PAY_STATUS"
echo "  Mitra        : $MITRA_NAME"
echo ""
[ "$FINAL_STATUS" = "completed" ] && ok "SIMULASI BERHASIL PENUH!" || echo "⚠ Status akhir bukan 'completed': $FINAL_STATUS"

echo ""
echo "$SEP"
echo "$SEP"
echo ""
