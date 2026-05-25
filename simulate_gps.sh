#!/bin/bash
# Simulasi GPS ZasaGo + ZasaFood: kirim update koordinat mitra selama order aktif
# Verifikasi: GPS tersimpan di Redis + endpoint getLocation mengembalikan koordinat

BASE="http://localhost:8000/api"
SEP="────────────────────────────────────────"
H='Accept: application/json'
CT='Content-Type: application/json'

ok()  { echo "✅ $1"; }
err() { echo "❌ $1"; }
hdr() { echo ""; echo "$SEP"; echo "  $1"; echo "$SEP"; }

# Titik koordinat simulasi (bergerak sedikit tiap update)
LAT="-6.2615"; LNG="106.8106"

# ─── Login mitra ──────────────────────────────────────────────────────────────
hdr "1. Login Mitra"
RESP=$(curl -s -H "$H" -H "$CT" -X POST "$BASE/auth/login" \
  -d '{"email":"dadang@zasaqu.com","password":"password123"}')
MTOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
MUID=$(echo "$RESP"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null)
[ -z "$MTOKEN" ] && { err "Login gagal"; exit 1; }
ok "Login sebagai Dadang (user_id: $MUID)"

# ─── Buat order ZasaGo aktif ─────────────────────────────────────────────────
hdr "2. Setup: Buat + Accept Order ZasaGo"
# Login customer
CRESP=$(curl -s -H "$H" -H "$CT" -X POST "$BASE/auth/login" \
  -d '{"email":"pelanggan@zasaqu.com","password":"password123"}')
CTOKEN=$(echo "$CRESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
# Buat order
ORESP=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $CTOKEN" \
  -X POST "$BASE/orders" -d '{
    "pickup_address":"Jl. A","pickup_lat":-6.2615,"pickup_lng":106.8106,
    "dropoff_address":"Jl. B","dropoff_lat":-6.2700,"dropoff_lng":106.8200,
    "item_category_id":1,"item_description":"Dokumen GPS test","item_value":10000,
    "vehicle_type":"motor","shipping_fee":5000,"payment_method":"wallet"
  }')
ZG_OID=$(echo "$ORESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
ZG_NUM=$(echo "$ORESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('order_number',''))" 2>/dev/null)
[ -z "$ZG_OID" ] && { err "Gagal buat order ZasaGo: $ORESP"; exit 1; }
# Accept
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X POST "$BASE/mitra/orders/$ZG_OID/accept" > /dev/null
# Set on_pickup
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/mitra/orders/$ZG_OID/status" -d '{"status":"on_pickup"}' > /dev/null
ok "Order ZasaGo #$ZG_NUM (ID: $ZG_OID) — status: on_pickup"

# ─── Buat order ZasaFood aktif ────────────────────────────────────────────────
hdr "3. Setup: Buat + Accept Order ZasaFood"
FORESP=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $CTOKEN" \
  -X POST "$BASE/food/orders" -d '{
    "merchant_id":1,"items":[{"menu_item_id":1,"quantity":1}],
    "delivery_address":"Jl. B","delivery_lat":-6.2700,"delivery_lng":106.8200,
    "delivery_fee":8000,"payment_method":"wallet"
  }')
ZF_OID=$(echo "$FORESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
ZF_NUM=$(echo "$FORESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('order_number',''))" 2>/dev/null)
[ -z "$ZF_OID" ] && { err "Gagal buat order ZasaFood: $FORESP"; exit 1; }

# Login merchant dan proses sampai ready_for_pickup
MRESP=$(curl -s -H "$H" -H "$CT" -X POST "$BASE/auth/login" \
  -d '{"email":"busari@zasaqu.id","password":"password123"}')
MERTOKEN=$(echo "$MRESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MERTOKEN" \
  -X POST "$BASE/food/merchant/orders/$ZF_OID/accept" -d '{"prep_minutes":5}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MERTOKEN" \
  -X POST "$BASE/food/merchant/orders/$ZF_OID/preparing" > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MERTOKEN" \
  -X POST "$BASE/food/merchant/orders/$ZF_OID/ready" > /dev/null

# Mitra accept food order
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X POST "$BASE/food/mitra/orders/$ZF_OID/accept" > /dev/null
ok "Order ZasaFood #$ZF_NUM (ID: $ZF_OID) — status: mitra_on_pickup"

# ─── Simulasi 5 update GPS ────────────────────────────────────────────────────
hdr "4. Simulasi 5x GPS Update (bergerak dari titik awal)"
echo "   Koordinat awal: $LAT, $LNG"
for i in 1 2 3 4 5; do
  # Bergerak +0.001 derajat tiap iterasi (~111 meter)
  LAT=$(python3 -c "print(round($LAT + 0.001, 4))")
  LNG=$(python3 -c "print(round($LNG + 0.001, 4))")

  R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
    -X POST "$BASE/mitra/gps/update" -d "{\"lat\":$LAT,\"lng\":$LNG}")
  STATUS=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('ok') else d.get('reason','error'))" 2>/dev/null)
  echo "   Update $i: ($LAT, $LNG) → $STATUS"
  sleep 1
done

# ─── Verifikasi GPS di endpoint ZasaGo ───────────────────────────────────────
hdr "5. Verifikasi GPS — ZasaGo /orders/$ZG_OID/location"
GLOC=$(curl -s -H "$H" -H "Authorization: Bearer $CTOKEN" \
  "$BASE/orders/$ZG_OID/location")
GPS_ACTIVE=$(echo "$GLOC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('gps_active', False))" 2>/dev/null)
GPS_LAT=$(echo "$GLOC"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('location',{}).get('lat','?') if d.get('location') else '?')" 2>/dev/null)
GPS_LNG=$(echo "$GLOC"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('location',{}).get('lng','?') if d.get('location') else '?')" 2>/dev/null)
[ "$GPS_ACTIVE" = "True" ] \
  && ok "GPS aktif — posisi: ($GPS_LAT, $GPS_LNG)" \
  || err "GPS tidak aktif atau tidak ditemukan. Response: $GLOC"

# ─── Verifikasi GPS di endpoint ZasaFood ─────────────────────────────────────
hdr "6. Verifikasi GPS — ZasaFood /food/orders/$ZF_OID"
FORD=$(curl -s -H "$H" -H "Authorization: Bearer $CTOKEN" \
  "$BASE/food/orders/$ZF_OID")
GPS_DATA=$(echo "$FORD" | python3 -c "import sys,json; d=json.load(sys.stdin); gps=d.get('mitra_gps'); print('ada: lat='+str(gps['lat'])+' lng='+str(gps['lng']) if gps else 'tidak ada')" 2>/dev/null)
echo "   mitra_gps: $GPS_DATA"
[[ "$GPS_DATA" == ada* ]] \
  && ok "GPS ZasaFood terdeteksi" \
  || err "GPS ZasaFood tidak ditemukan"

# ─── Cek GPS status dari sisi mitra ──────────────────────────────────────────
hdr "7. GPS Status dari Sisi Mitra"
MSTATUS=$(curl -s -H "$H" -H "Authorization: Bearer $MTOKEN" \
  "$BASE/mitra/gps/status")
ACTIVE=$(echo "$MSTATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('active', False))" 2>/dev/null)
MLAT=$(echo "$MSTATUS"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('location',{}).get('lat','?') if d.get('location') else '?')" 2>/dev/null)
MLNG=$(echo "$MSTATUS"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('location',{}).get('lng','?') if d.get('location') else '?')" 2>/dev/null)
[ "$ACTIVE" = "True" ] \
  && ok "Mitra GPS aktif — last pos: ($MLAT, $MLNG)" \
  || err "Mitra GPS tidak aktif"

# ─── Test report lost ─────────────────────────────────────────────────────────
hdr "8. Test GPS Lost (reportLost)"
LOST=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X POST "$BASE/mitra/gps/lost")
LMSG=$(echo "$LOST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','?'))" 2>/dev/null)
ok "$LMSG"

# Verifikasi GPS sudah terhapus
sleep 1
AFTER=$(curl -s -H "$H" -H "Authorization: Bearer $MTOKEN" "$BASE/mitra/gps/status")
AFTER_ACTIVE=$(echo "$AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('active', True))" 2>/dev/null)
[ "$AFTER_ACTIVE" = "False" ] \
  && ok "GPS Redis terhapus setelah reportLost ✓" \
  || err "GPS masih ada di Redis setelah reportLost"

# ─── Cleanup ──────────────────────────────────────────────────────────────────
hdr "9. Cleanup (force-complete orders)"
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/mitra/orders/$ZG_OID/status" -d '{"status":"picked_up"}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/mitra/orders/$ZG_OID/status" -d '{"status":"on_delivery"}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/mitra/orders/$ZG_OID/status" -d '{"status":"delivered"}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/mitra/orders/$ZG_OID/status" -d '{"status":"completed"}' > /dev/null
ok "ZasaGo order completed"

curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/food/mitra/orders/$ZF_OID/status" -d '{"status":"picked_up"}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/food/mitra/orders/$ZF_OID/status" -d '{"status":"on_delivery"}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X PATCH "$BASE/food/mitra/orders/$ZF_OID/status" -d '{"status":"delivered"}' > /dev/null
curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $CTOKEN" \
  -X POST "$BASE/food/orders/$ZF_OID/confirm" > /dev/null
ok "ZasaFood order completed"

echo ""
echo "$SEP"
echo "  SIMULASI GPS SELESAI"
echo "$SEP"
echo ""
