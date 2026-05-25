#!/bin/bash
# Simulasi full order ZasaFood:
# customer buat order → merchant accept → preparing → ready →
# mitra accept → picked_up → on_delivery → delivered → customer confirm → completed

BASE="http://localhost:8000/api"
SEP="────────────────────────────────────────"

ok()  { echo "✅ $1"; }
err() { echo "❌ $1"; exit 1; }
hdr() { echo ""; echo "$SEP"; echo "  $1"; echo "$SEP"; }
msg() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', str(d)[:120]))" 2>/dev/null; }
H='Accept: application/json'
CT='Content-Type: application/json'

# ─── 1. Login customer ────────────────────────────────────────────────────────
hdr "1. Login Customer (pelanggan@zasaqu.com)"
RESP=$(curl -s -H "$H" -H "$CT" -X POST "$BASE/auth/login" \
  -d '{"email":"pelanggan@zasaqu.com","password":"password123"}')
CTOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
[ -z "$CTOKEN" ] && err "Login customer gagal: $RESP"
ok "Login sebagai $(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('name','?'))" 2>/dev/null)"

# ─── 2. Lihat merchant & menu ─────────────────────────────────────────────────
hdr "2. Lihat Merchant Tersedia"
MERCHANTS=$(curl -s -H "$H" -H "Authorization: Bearer $CTOKEN" "$BASE/food/merchants")
MERCHANT_ID=$(echo "$MERCHANTS" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',d) if isinstance(d,dict) else d; print(items[0]['id'] if items else '')" 2>/dev/null)
MERCHANT_NAME=$(echo "$MERCHANTS" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',d) if isinstance(d,dict) else d; print(items[0]['name'] if items else '')" 2>/dev/null)
[ -z "$MERCHANT_ID" ] && err "Tidak ada merchant aktif"
ok "Merchant: $MERCHANT_NAME (ID: $MERCHANT_ID)"

# ─── 3. Lihat menu merchant ───────────────────────────────────────────────────
hdr "3. Lihat Menu"
MERCHANT_DETAIL=$(curl -s -H "$H" -H "Authorization: Bearer $CTOKEN" "$BASE/food/merchants/$MERCHANT_ID")
ITEM_ID=$(echo "$MERCHANT_DETAIL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
cats=d.get('menu_categories', d.get('categories', []))
for cat in cats:
    for item in cat.get('items',[]):
        if item.get('is_available',True): print(item['id']); exit()
" 2>/dev/null)
ITEM_NAME=$(echo "$MERCHANT_DETAIL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
cats=d.get('menu_categories', d.get('categories', []))
for cat in cats:
    for item in cat.get('items',[]):
        if item.get('is_available',True): print(item['name']); exit()
" 2>/dev/null)
ITEM_PRICE=$(echo "$MERCHANT_DETAIL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
cats=d.get('menu_categories', d.get('categories', []))
for cat in cats:
    for item in cat.get('items',[]):
        if item.get('is_available',True): print(item['price']); exit()
" 2>/dev/null)

# Fallback ke item ID 1 jika parsing gagal
[ -z "$ITEM_ID" ] && ITEM_ID=1 && ITEM_NAME="Nasi Campur" && ITEM_PRICE=18000
ok "Menu dipilih: $ITEM_NAME (ID: $ITEM_ID) — Rp $ITEM_PRICE"

# ─── 4. Estimasi delivery ─────────────────────────────────────────────────────
hdr "4. Estimasi Delivery Fee"
DLAT=$(echo "$MERCHANTS" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',d) if isinstance(d,dict) else d; lat=float(items[0].get('lat',-6.2615)); print(round(lat-0.01,4))" 2>/dev/null)
DLNG=$(echo "$MERCHANTS" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',d) if isinstance(d,dict) else d; lng=float(items[0].get('lng',106.8106)); print(round(lng+0.01,4))" 2>/dev/null)
[ -z "$DLAT" ] && DLAT="-6.2715" && DLNG="106.8206"
EST=$(curl -s -H "$H" -H "Authorization: Bearer $CTOKEN" \
  "$BASE/food/delivery-estimate?merchant_id=$MERCHANT_ID&delivery_lat=$DLAT&delivery_lng=$DLNG")
DFEE=$(echo "$EST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('fee', d.get('delivery_fee', 5000)))" 2>/dev/null)
[ -z "$DFEE" ] && DFEE=5000
ok "Delivery fee estimasi: Rp $DFEE"

# ─── 5. Buat order ────────────────────────────────────────────────────────────
hdr "5. Buat Order ZasaFood (wallet)"
ORDER_RESP=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $CTOKEN" \
  -X POST "$BASE/food/orders" -d "{
    \"merchant_id\": $MERCHANT_ID,
    \"items\": [{\"menu_item_id\": $ITEM_ID, \"quantity\": 2, \"notes\": \"tidak pedas\"}],
    \"delivery_address\": \"Jl. Sudirman No.5, dekat merchant\",
    \"delivery_lat\": $DLAT,
    \"delivery_lng\": $DLNG,
    \"delivery_fee\": $DFEE,
    \"payment_method\": \"wallet\",
    \"notes\": \"Simulasi order ZasaFood\"
  }")
ORDER_ID=$(echo "$ORDER_RESP"     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
ORDER_NUM=$(echo "$ORDER_RESP"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('order_number',''))" 2>/dev/null)
ORDER_STATUS=$(echo "$ORDER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('status',''))" 2>/dev/null)
ORDER_TOTAL=$(echo "$ORDER_RESP"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('total_amount',''))" 2>/dev/null)
[ -z "$ORDER_ID" ] && err "Buat order gagal: $ORDER_RESP"
ok "Order dibuat: #$ORDER_NUM (ID: $ORDER_ID) — status: $ORDER_STATUS — total: Rp $ORDER_TOTAL"

# ─── 6. Login merchant ────────────────────────────────────────────────────────
hdr "6. Login Merchant (busari@zasaqu.id)"
RESP3=$(curl -s -H "$H" -H "$CT" -X POST "$BASE/auth/login" \
  -d '{"email":"busari@zasaqu.id","password":"password123"}')
MERTOKEN=$(echo "$RESP3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
[ -z "$MERTOKEN" ] && err "Login merchant gagal: $RESP3"
ok "Login sebagai $(echo "$RESP3" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('name','?'))" 2>/dev/null)"

# ─── 7. Merchant accept ───────────────────────────────────────────────────────
hdr "7. Merchant Accept Order (estimasi 15 menit)"
sleep 1
R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MERTOKEN" \
  -X POST "$BASE/food/merchant/orders/$ORDER_ID/accept" \
  -d '{"prep_minutes":15}')
echo "   $(echo "$R" | msg)"
echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'berhasil' in d.get('message','').lower() or d.get('data') else 1)" 2>/dev/null \
  && ok "Merchant accept — status: merchant_accepted" || echo "   ⚠ Cek respons di atas"

# ─── 8. Merchant: mulai masak ─────────────────────────────────────────────────
hdr "8. Merchant → Mulai Masak (preparing)"
sleep 1
R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MERTOKEN" \
  -X POST "$BASE/food/merchant/orders/$ORDER_ID/preparing")
ok "$(echo "$R" | msg)"

# ─── 9. Merchant: pesanan siap ────────────────────────────────────────────────
hdr "9. Merchant → Pesanan Siap (ready_for_pickup)"
sleep 1
R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MERTOKEN" \
  -X POST "$BASE/food/merchant/orders/$ORDER_ID/ready")
ok "$(echo "$R" | msg)"

# ─── 10. Login mitra ──────────────────────────────────────────────────────────
hdr "10. Login Mitra (dadang@zasaqu.com)"
RESP4=$(curl -s -H "$H" -H "$CT" -X POST "$BASE/auth/login" \
  -d '{"email":"dadang@zasaqu.com","password":"password123"}')
MTOKEN=$(echo "$RESP4" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
[ -z "$MTOKEN" ] && err "Login mitra gagal: $RESP4"
ok "Login sebagai $(echo "$RESP4" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('name','?'))" 2>/dev/null)"

# ─── 11. Mitra cek order food tersedia ────────────────────────────────────────
hdr "11. Mitra Cek Order Food Tersedia"
AVAIL=$(curl -s -H "$H" -H "Authorization: Bearer $MTOKEN" "$BASE/food/mitra/orders/available")
COUNT=$(echo "$AVAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('data',[]); print(len(items))" 2>/dev/null)
ok "Order food tersedia: $COUNT"

# ─── 12. Mitra accept order food ──────────────────────────────────────────────
hdr "12. Mitra Accept Order Food #$ORDER_NUM"
sleep 1
R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
  -X POST "$BASE/food/mitra/orders/$ORDER_ID/accept")
echo "   $(echo "$R" | msg)"
ok "Mitra accept — status: mitra_on_pickup"

do_food_status() {
  local STEP="$1" STATUS="$2" DESC="$3"
  hdr "$STEP Status → $STATUS ($DESC)"
  sleep 1
  R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $MTOKEN" \
    -X PATCH "$BASE/food/mitra/orders/$ORDER_ID/status" \
    -d "{\"status\":\"$STATUS\"}")
  M=$(echo "$R" | msg)
  if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(1 if 'tidak valid' in str(d).lower() or 'error' in str(d).lower() else 0)" 2>/dev/null; then
    ok "$M"
  else
    echo "   ⚠ $M"
  fi
}

do_food_status "13." "picked_up"   "Mitra ambil dari merchant"
do_food_status "14." "on_delivery" "Mitra dalam perjalanan ke customer"
do_food_status "15." "delivered"   "Pesanan tiba di customer"

# ─── 16. Customer konfirmasi terima ───────────────────────────────────────────
hdr "16. Customer Konfirmasi Terima"
sleep 1
R=$(curl -s -H "$H" -H "$CT" -H "Authorization: Bearer $CTOKEN" \
  -X POST "$BASE/food/orders/$ORDER_ID/confirm")
ok "$(echo "$R" | msg)"

# ─── 17. Verifikasi final ─────────────────────────────────────────────────────
hdr "17. Verifikasi Final"
FINAL=$(curl -s -H "$H" -H "Authorization: Bearer $CTOKEN" "$BASE/food/orders/$ORDER_ID")
FSTATUS=$(echo "$FINAL"   | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(d.get('status','unknown'))" 2>/dev/null)
FPAY=$(echo "$FINAL"      | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(d.get('payment_status','unknown'))" 2>/dev/null)
FMITRA=$(echo "$FINAL"    | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(d.get('mitra',{}).get('name','?') if d.get('mitra') else '-')" 2>/dev/null)
FMERCHANT=$(echo "$FINAL" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(d.get('merchant',{}).get('name','?') if d.get('merchant') else '-')" 2>/dev/null)
FITEMS=$(echo "$FINAL"    | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(', '.join(i['item_name']+'x'+str(i['quantity']) for i in d.get('items',[])))" 2>/dev/null)

echo ""
echo "  Order #$ORDER_NUM"
echo "  Merchant     : $FMERCHANT"
echo "  Items        : $FITEMS"
echo "  Total        : Rp $ORDER_TOTAL"
echo "  Status       : $FSTATUS"
echo "  Payment      : $FPAY"
echo "  Mitra        : $FMITRA"
echo ""
[ "$FSTATUS" = "completed" ] && ok "SIMULASI ZASAFOOD BERHASIL PENUH!" || echo "⚠ Status akhir: $FSTATUS (expected: completed)"

echo ""
echo "$SEP"
echo "$SEP"
echo ""
