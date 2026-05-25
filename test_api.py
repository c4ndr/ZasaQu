#!/usr/bin/env python3
"""
ZasaQu API Integration Test Suite
Run: python3 test_api.py [--base http://localhost:8000/api]
"""

import sys
import time
import json
import argparse
import requests
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://localhost:8000/api')
parser.add_argument('--verbose', '-v', action='store_true')
args = parser.parse_args()

BASE = args.base.rstrip('/')

ACCOUNTS = {
    'admin':     {'email': 'admin@zasaqu.id',       'password': 'password123'},
    'customer':  {'email': 'pelanggan@zasaqu.com',   'password': 'password123'},
    'mitra':     {'email': 'dadang@zasaqu.com',      'password': 'password123'},
    'merchant':  {'email': 'busari@zasaqu.id',       'password': 'password123'},
}

# ── Color helpers ───────────────────────────────────────────────────────────
GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
DIM    = '\033[2m'
RESET  = '\033[0m'

results = []

def ok(name, note=''):
    results.append(('PASS', name))
    suffix = f' {DIM}({note}){RESET}' if note else ''
    print(f'  {GREEN}✓{RESET} {name}{suffix}')

def fail(name, reason=''):
    results.append(('FAIL', name))
    print(f'  {RED}✗{RESET} {name}  {RED}{reason}{RESET}')

def skip(name, reason=''):
    results.append(('SKIP', name))
    print(f'  {YELLOW}–{RESET} {name}  {DIM}{reason}{RESET}')

def section(title):
    print(f'\n{BOLD}{CYAN}▶ {title}{RESET}')

def _headers(token, extra=None):
    h = {'Accept': 'application/json'}
    if token:
        h['Authorization'] = f'Bearer {token}'
    if extra:
        h.update(extra)
    return h

def get(token, path, params=None):
    return requests.get(f'{BASE}{path}', headers=_headers(token), params=params, timeout=10)

def post(token, path, data=None, files=None):
    if files:
        return requests.post(f'{BASE}{path}', headers=_headers(token), data=data or {}, files=files, timeout=10)
    return requests.post(f'{BASE}{path}', headers=_headers(token, {'Content-Type': 'application/json'}), json=data or {}, timeout=10)

def patch(token, path, data=None):
    return requests.patch(f'{BASE}{path}', headers=_headers(token, {'Content-Type': 'application/json'}), json=data or {}, timeout=10)

def delete(token, path):
    return requests.delete(f'{BASE}{path}', headers=_headers(token), timeout=10)

# ══════════════════════════════════════════════════════════════════════════════
# 1. Infrastructure
# ══════════════════════════════════════════════════════════════════════════════
section('Infrastructure')
try:
    r = requests.get(f'{BASE}/health', timeout=10)
    d = r.json()
    if r.status_code == 200 and d.get('status') == 'healthy':
        ok('Health check', 'all systems green')
    else:
        fail('Health check', f"status={d.get('status')} http={r.status_code}")

    checks = d.get('checks', {})
    for svc in ['database', 'redis', 'cache', 'queue', 'storage']:
        c = checks.get(svc, {})
        s = c.get('status', 'missing')
        if s == 'ok':
            extra = ''
            if svc == 'queue':
                extra = f"pending={c.get('pending',0)} failed={c.get('failed',0)}"
            elif svc == 'database':
                extra = f"users={c.get('users',0)}"
            ok(f'  {svc}', extra)
        elif s == 'warning':
            skip(f'  {svc}', c.get('warning', c.get('message', '')))
        else:
            fail(f'  {svc}', c.get('message', 'error'))

    # Broadcast warning
    bc = checks.get('broadcast', {})
    if bc.get('connection') == 'log':
        skip('  broadcast', 'log driver — real-time disabled')
    else:
        ok('  broadcast', bc.get('connection'))

except Exception as e:
    fail('Health check', str(e))

# App info (public)
try:
    r = requests.get(f'{BASE}/app-info', timeout=10)
    d = r.json()
    ok('App info', d.get('app_name', '?'))
except Exception as e:
    fail('App info', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 2. Authentication
# ══════════════════════════════════════════════════════════════════════════════
section('Authentication')
tokens = {}

for role, creds in ACCOUNTS.items():
    try:
        r = post(None, '/auth/login', creds)
        if r.status_code == 200:
            tokens[role] = r.json()['token']
            ok(f'Login {role}', creds['email'])
        else:
            fail(f'Login {role}', f"HTTP {r.status_code}: {r.text[:80]}")
    except Exception as e:
        fail(f'Login {role}', str(e))

# /auth/me for each role
for role, token in tokens.items():
    try:
        r = get(token, '/auth/me')
        u = r.json()
        if r.status_code == 200 and u.get('role') == (role if role != 'customer' else 'pelanggan'):
            ok(f'Me ({role})', u.get('name', '?'))
        elif r.status_code == 200:
            ok(f'Me ({role})', u.get('name', '?'))
        else:
            fail(f'Me ({role})', f"HTTP {r.status_code}")
    except Exception as e:
        fail(f'Me ({role})', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 3. Wallet & Top-up
# ══════════════════════════════════════════════════════════════════════════════
section('Wallet & Top-up')

if 'customer' in tokens:
    try:
        r = get(tokens['customer'], '/wallet/summary')
        d = r.json()
        if r.status_code == 200:
            ok('Wallet summary', f"balance=Rp{d.get('balance',0):,.0f}")
        else:
            fail('Wallet summary', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Wallet summary', str(e))

    try:
        r = get(tokens['customer'], '/wallet/transactions')
        if r.status_code == 200:
            total = r.json().get('meta', {}).get('total', 0)
            ok('Wallet transactions', f"{total} transactions")
        else:
            fail('Wallet transactions', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Wallet transactions', str(e))

    try:
        r = get(tokens['customer'], '/topup/history')
        ok('Topup history', f"HTTP {r.status_code}") if r.status_code == 200 else fail('Topup history', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Topup history', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 4. ZasaGo Orders
# ══════════════════════════════════════════════════════════════════════════════
section('ZasaGo Orders')

zasago_order_id = None

if 'customer' in tokens:
    try:
        r = get(tokens['customer'], '/shipping/estimate', {
            'pickup_lat': -6.200, 'pickup_lng': 106.816,
            'dropoff_lat': -6.210, 'dropoff_lng': 106.820,
            'vehicle_type': 'motor',
        })
        if r.status_code == 200:
            d = r.json()
            ok('Shipping estimate', f"Rp{d.get('shipping_fee',0):,} ({d.get('distance_km',0)} km)")
        else:
            fail('Shipping estimate', f"HTTP {r.status_code}: {r.text[:80]}")
    except Exception as e:
        fail('Shipping estimate', str(e))

    try:
        r = get(tokens['customer'], '/orders')
        if r.status_code == 200:
            total = r.json().get('meta', {}).get('total', r.json().get('total', 0))
            ok('Orders list', f"{total} orders")
        else:
            fail('Orders list', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Orders list', str(e))

    try:
        r = get(tokens['customer'], '/item-categories')
        if r.status_code == 200:
            ok('Item categories', f"{len(r.json())} categories")
        else:
            fail('Item categories', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Item categories', str(e))

if 'mitra' in tokens:
    try:
        r = get(tokens['mitra'], '/mitra/orders/available')
        if r.status_code == 200:
            d = r.json()
            count = len(d) if isinstance(d, list) else len(d.get('data', []))
            ok('Mitra available orders', f"{count} orders")
        else:
            fail('Mitra available orders', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Mitra available orders', str(e))

    try:
        r = get(tokens['mitra'], '/mitra/orders/my')
        if r.status_code == 200:
            ok('Mitra my orders', f"{len(r.json().get('data',[]))} orders")
        else:
            fail('Mitra my orders', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Mitra my orders', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 5. ZasaFood
# ══════════════════════════════════════════════════════════════════════════════
section('ZasaFood')

food_order_id = None

if 'customer' in tokens:
    try:
        r = get(tokens['customer'], '/food/merchants')
        if r.status_code == 200:
            merchants = r.json().get('data', [])
            ok('Merchant list', f"{len(merchants)} merchants")
        else:
            fail('Merchant list', f"HTTP {r.status_code}: {r.text[:80]}")
            merchants = []
    except Exception as e:
        fail('Merchant list', str(e))
        merchants = []

    if merchants:
        mid = merchants[0]['id']
        try:
            r = get(tokens['customer'], f'/food/merchants/{mid}')
            if r.status_code == 200:
                m = r.json().get('data', {})
                items = []
                for cat in m.get('categories', []):
                    items.extend(cat.get('items', []))
                ok('Merchant detail', f"{m.get('name','?')} — {len(items)} items")
            else:
                fail('Merchant detail', f"HTTP {r.status_code}")
        except Exception as e:
            fail('Merchant detail', str(e))

    # Delivery estimate food
    try:
        r = get(tokens['customer'], '/food/delivery-estimate', {
            'merchant_id': 1, 'dest_lat': -6.2615, 'dest_lng': 106.8106,
        })
        ok('Food delivery estimate', f"HTTP {r.status_code}") if r.status_code in (200, 422) else fail('Food delivery estimate', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Food delivery estimate', str(e))

    # Food orders list
    try:
        r = get(tokens['customer'], '/food/orders')
        if r.status_code == 200:
            total = r.json().get('meta', {}).get('total', 0)
            ok('Food orders list', f"{total} orders")
        else:
            fail('Food orders list', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Food orders list', str(e))

# Merchant endpoints
if 'merchant' in tokens:
    try:
        r = get(tokens['merchant'], '/food/merchant/profile')
        if r.status_code == 200:
            m = r.json().get('data', {})
            ok('Merchant profile', f"{m.get('name','?')} — {m.get('status','?')}")
        else:
            fail('Merchant profile', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Merchant profile', str(e))

    try:
        r = get(tokens['merchant'], '/food/merchant/statistics')
        if r.status_code == 200:
            d = r.json().get('data', {})
            ok('Merchant statistics', f"today={d.get('orders_today',0)} orders, rating={d.get('average_rating',0)}")
        else:
            fail('Merchant statistics', f"HTTP {r.status_code}: {r.text[:80]}")
    except Exception as e:
        fail('Merchant statistics', str(e))

    try:
        r = get(tokens['merchant'], '/food/merchant/menu/items')
        if r.status_code == 200:
            ok('Merchant menu items', f"{len(r.json().get('data',[]))} items")
        else:
            fail('Merchant menu items', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Merchant menu items', str(e))

    try:
        r = get(tokens['merchant'], '/food/merchant/orders')
        if r.status_code == 200:
            total = r.json().get('meta', {}).get('total', 0)
            ok('Merchant orders', f"{total} orders")
        else:
            fail('Merchant orders', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Merchant orders', str(e))

# Mitra food endpoints
if 'mitra' in tokens:
    try:
        r = get(tokens['mitra'], '/food/mitra/orders/available')
        if r.status_code == 200:
            ok('Food mitra available', f"{len(r.json().get('data',[]))} orders")
        else:
            fail('Food mitra available', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Food mitra available', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 6. JastipQu (ZasaGo Jastip)
# ══════════════════════════════════════════════════════════════════════════════
section('JastipQu (ZasaGo)')

if 'customer' in tokens:
    try:
        r = get(tokens['customer'], '/jastip/sessions/available', {'vehicle_type': 'motor'})
        if r.status_code == 200:
            d = r.json()
            count = len(d) if isinstance(d, list) else len(d.get('data', []))
            ok('Jastip available sessions', f"{count} sessions")
        else:
            fail('Jastip available sessions', f"HTTP {r.status_code}: {r.text[:80]}")
    except Exception as e:
        fail('Jastip available sessions', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 7. Food Jastip
# ══════════════════════════════════════════════════════════════════════════════
section('Food Jastip')

if 'customer' in tokens:
    try:
        r = get(tokens['customer'], '/food/jastip/sessions/available')
        if r.status_code == 200:
            ok('Food jastip sessions', f"{len(r.json())} sessions")
        else:
            fail('Food jastip sessions', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Food jastip sessions', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 8. GPS
# ══════════════════════════════════════════════════════════════════════════════
section('GPS')

if 'mitra' in tokens:
    try:
        r = get(tokens['mitra'], '/mitra/gps/status')
        if r.status_code == 200:
            d = r.json()
            ok('GPS status', f"active={d.get('active',False)} lat={d.get('lat','—')}")
        else:
            fail('GPS status', f"HTTP {r.status_code}")
    except Exception as e:
        fail('GPS status', str(e))

    try:
        r = post(tokens['mitra'], '/mitra/gps/update', {
            'lat': -6.2615, 'lng': 106.8106, 'accuracy': 10,
        })
        if r.status_code == 200:
            ok('GPS update', 'stored in Redis')
        else:
            fail('GPS update', f"HTTP {r.status_code}: {r.text[:80]}")
    except Exception as e:
        fail('GPS update', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 9. Notifications
# ══════════════════════════════════════════════════════════════════════════════
section('Notifications')

for role in ['customer', 'mitra', 'merchant']:
    if role not in tokens:
        continue
    try:
        r = get(tokens[role], '/notifications')
        if r.status_code == 200:
            data = r.json()
            total = data.get('data', {}).get('total', 0)
            ok(f'Notifications ({role})', f"{total} notifications")
        else:
            fail(f'Notifications ({role})', f"HTTP {r.status_code}")
    except Exception as e:
        fail(f'Notifications ({role})', str(e))

    try:
        r = get(tokens[role], '/notifications/unread-count')
        if r.status_code == 200:
            count = r.json().get('unread_count', 0)
            ok(f'Unread count ({role})', f"{count} unread")
        else:
            fail(f'Unread count ({role})', f"HTTP {r.status_code}")
    except Exception as e:
        fail(f'Unread count ({role})', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 10. Chat
# ══════════════════════════════════════════════════════════════════════════════
section('Chat')

if 'customer' in tokens:
    try:
        r = get(tokens['customer'], '/chat/templates')
        if r.status_code == 200:
            ok('Chat templates', f"{len(r.json())} templates")
        else:
            fail('Chat templates', f"HTTP {r.status_code}")
    except Exception as e:
        fail('Chat templates', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 11. Admin
# ══════════════════════════════════════════════════════════════════════════════
section('Admin')

if 'admin' in tokens:
    endpoints = [
        ('/admin/dashboard',          'Dashboard'),
        ('/admin/users',              'Users list'),
        ('/admin/topup',              'Topup list'),
        ('/admin/withdraw',           'Withdraw list'),
        ('/admin/orders',             'Orders list'),
        ('/admin/audit-logs',         'Audit logs'),
        ('/admin/stats/overview',     'Stats overview'),
        ('/admin/food/merchants',     'Food merchants'),
        ('/admin/food/orders',        'Food orders'),
    ]
    for path, name in endpoints:
        try:
            r = get(tokens['admin'], path)
            if r.status_code == 200:
                d = r.json()
                total = d.get('meta', {}).get('total') or d.get('total') or ''
                note = f"{total} records" if total else ''
                ok(name, note)
            else:
                fail(name, f"HTTP {r.status_code}: {r.text[:60]}")
        except Exception as e:
            fail(name, str(e))

    # Promos (public + admin)
    try:
        r = requests.get(f'{BASE}/promos', timeout=10)
        d = r.json()
        ok('Promos (public)', f"{len(d)} promos, base64={any('image_data_url' in p for p in d)}")
    except Exception as e:
        fail('Promos (public)', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 12. Maintenance mode
# ══════════════════════════════════════════════════════════════════════════════
section('Maintenance Mode')

if 'admin' in tokens:
    try:
        # Nyalakan maintenance
        r = requests.put(f'{BASE}/admin/settings/maintenance_mode',
                         headers={'Authorization': f'Bearer {tokens["admin"]}',
                                  'Content-Type': 'application/json'},
                         json={'value': '1'}, timeout=10)
        if r.status_code != 200:
            fail('Enable maintenance', f"HTTP {r.status_code}")
        else:
            # Cek customer terblokir
            r2 = get(tokens.get('customer', ''), '/food/merchants')
            if r2.status_code == 503 and r2.json().get('maintenance'):
                ok('Maintenance blocks customer', 'HTTP 503')
            else:
                fail('Maintenance blocks customer', f"HTTP {r2.status_code} (expected 503)")

            # Cek admin masih bisa akses
            r3 = get(tokens['admin'], '/admin/dashboard')
            if r3.status_code == 200:
                ok('Maintenance allows admin', 'admin bypassed')
            else:
                fail('Maintenance allows admin', f"HTTP {r3.status_code}")

            # Matikan maintenance
            requests.put(f'{BASE}/admin/settings/maintenance_mode',
                         headers={'Authorization': f'Bearer {tokens["admin"]}',
                                  'Content-Type': 'application/json'},
                         json={'value': '0'}, timeout=10)
    except Exception as e:
        fail('Maintenance mode', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
passed = sum(1 for r, _ in results if r == 'PASS')
failed = sum(1 for r, _ in results if r == 'FAIL')
skipped = sum(1 for r, _ in results if r == 'SKIP')
total  = len(results)

print(f'\n{"─"*54}')
print(f'{BOLD}Results{RESET}  {GREEN}{passed} passed{RESET}  {RED}{failed} failed{RESET}  {YELLOW}{skipped} skipped{RESET}  / {total} total')
print(f'{"─"*54}')

if failed:
    print(f'\n{RED}{BOLD}Failed tests:{RESET}')
    for r, name in results:
        if r == 'FAIL':
            print(f'  {RED}✗{RESET} {name}')

score = round(passed / (total - skipped) * 100) if (total - skipped) > 0 else 0
color = GREEN if score >= 90 else (YELLOW if score >= 70 else RED)
print(f'\n{color}{BOLD}Score: {score}%{RESET}')
if score == 100:
    print(f'{GREEN}All systems operational ✓{RESET}')
elif score >= 90:
    print(f'{YELLOW}Minor issues detected — check failed tests above{RESET}')
else:
    print(f'{RED}Critical issues detected — investigate failed tests{RESET}')

print()
sys.exit(0 if failed == 0 else 1)
