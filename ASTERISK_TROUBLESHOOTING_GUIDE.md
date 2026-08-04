# Asterisk AMI Troubleshooting Guide

Quick reference for diagnosing and fixing Asterisk AMI connection issues.

---

## Quick Diagnosis

### Step 1: Check Health Dashboard

```bash
curl http://localhost:3001/api/v1/health/asterisk
```

Look for `failureType` and `stage` fields.

---

## Common Issues

### Issue 1: "Connection refused"

**Symptom:**
```json
{
  "stage": "TCP_CONNECTING",
  "failureType": "CONNECTION_REFUSED"
}
```

**Diagnosis:** Port 5038 is closed or Asterisk is not running

**Fix:**

1. **Check Asterisk is running:**
   ```bash
   # Linux
   systemctl status asterisk
   
   # If stopped
   systemctl start asterisk
   ```

2. **Check AMI is enabled:**
   ```bash
   # Edit manager.conf
   nano /etc/asterisk/manager.conf
   
   # Ensure:
   [general]
   enabled = yes
   port = 5038
   bindaddr = 0.0.0.0
   ```

3. **Restart Asterisk:**
   ```bash
   systemctl restart asterisk
   ```

4. **Check firewall:**
   ```bash
   # Linux
   iptables -L -n | grep 5038
   
   # If blocked, allow it
   iptables -A INPUT -p tcp --dport 5038 -j ACCEPT
   
   # Windows (from app server)
   Test-NetConnection -ComputerName 192.168.1.4 -Port 5038
   ```

---

### Issue 2: "TCP connection timeout"

**Symptom:**
```json
{
  "stage": "TCP_CONNECTING",
  "failureType": "CONNECTION_TIMEOUT"
}
```

**Diagnosis:** Network issue or firewall dropping packets

**Fix:**

1. **Check network connectivity:**
   ```bash
   # From app server
   ping 192.168.1.4
   ```

2. **Check routing:**
   ```bash
   tracert 192.168.1.4
   ```

3. **Verify IP address:**
   ```bash
   # Check .env
   cat .env | grep ASTERISK_HOST
   
   # Should be:
   ASTERISK_HOST=192.168.1.4
   ```

4. **Check remote firewall:**
   - Firewall may be DROP-ing packets (not REJECT-ing)
   - Allow TCP port 5038 from app server IP

---

### Issue 3: "AMI banner not received"

**Symptom:**
```json
{
  "stage": "WAITING_BANNER",
  "failureType": "AMI_BANNER_TIMEOUT"
}
```

**Diagnosis:** TCP connects but AMI is disabled or misconfigured

**Fix:**

1. **Check AMI enabled:**
   ```bash
   cat /etc/asterisk/manager.conf
   ```
   
   Must have:
   ```ini
   [general]
   enabled = yes
   port = 5038
   bindaddr = 0.0.0.0
   ```

2. **Check Asterisk logs:**
   ```bash
   tail -f /var/log/asterisk/messages
   ```

3. **Test manually:**
   ```bash
   telnet 192.168.1.4 5038
   # Should see:
   # Asterisk Call Manager/1.1
   ```

4. **Reload Asterisk:**
   ```bash
   asterisk -rx "manager reload"
   ```

---

### Issue 4: "Invalid AMI username or password"

**Symptom:**
```json
{
  "stage": "AUTHENTICATING",
  "failureType": "AUTHENTICATION_FAILED"
}
```

**Diagnosis:** Credentials don't match

**Fix:**

1. **Check `.env` file:**
   ```bash
   cat apps/api/.env | grep ASTERISK_AMI
   ```
   
   Should have:
   ```bash
   ASTERISK_AMI_USERNAME=admin
   ASTERISK_AMI_SECRET=your-password
   ```

2. **Check `manager.conf`:**
   ```bash
   cat /etc/asterisk/manager.conf
   ```
   
   Must have matching section:
   ```ini
   [admin]
   secret = your-password
   read = all
   write = all
   ```

3. **Username is case-sensitive:**
   - `.env` has `admin`
   - `manager.conf` must have `[admin]` (same case)

4. **Update credentials:**
   ```bash
   # Edit .env
   nano apps/api/.env
   
   # Update:
   ASTERISK_AMI_USERNAME=root
   ASTERISK_AMI_SECRET=correct-password
   ```

5. **Restart app:**
   ```bash
   cd apps/api
   npm run dev
   ```

---

### Issue 5: "Authentication timeout"

**Symptom:**
```json
{
  "stage": "AUTHENTICATING",
  "failureType": "AUTHENTICATION_TIMEOUT"
}
```

**Diagnosis:** Asterisk is overloaded or hung

**Fix:**

1. **Check Asterisk resource usage:**
   ```bash
   top | grep asterisk
   ```

2. **Check Asterisk CLI:**
   ```bash
   asterisk -rx "core show channels"
   asterisk -rx "core show uptime"
   ```

3. **Check Asterisk logs:**
   ```bash
   tail -100 /var/log/asterisk/messages
   ```

4. **Restart Asterisk if needed:**
   ```bash
   systemctl restart asterisk
   ```

---

## Verification Commands

### Test from App Server (Windows)

```powershell
# Test TCP connectivity
Test-NetConnection -ComputerName 192.168.1.4 -Port 5038

# Should show:
# TcpTestSucceeded : True
```

### Test from App Server (Linux)

```bash
# Test TCP connectivity
nc -zv 192.168.1.4 5038

# Test AMI banner
telnet 192.168.1.4 5038
# Should see: Asterisk Call Manager/1.1
```

### Check Asterisk AMI

```bash
# On Asterisk server
asterisk -rx "manager show connected"

# Should show connected managers
```

---

## Health Dashboard Examples

### ✅ Healthy

```json
{
  "status": "ONLINE",
  "stage": "AUTHENTICATED",
  "message": "Connected and authenticated",
  "connected": true,
  "authenticated": true
}
```

### ❌ Asterisk Down

```json
{
  "status": "OFFLINE",
  "stage": "TCP_CONNECTING",
  "failureType": "CONNECTION_REFUSED",
  "message": "Connection refused at 192.168.1.4:5038",
  "connected": false
}
```

### ❌ Wrong Credentials

```json
{
  "status": "OFFLINE",
  "stage": "AUTHENTICATING",
  "failureType": "AUTHENTICATION_FAILED",
  "message": "Invalid AMI username or password",
  "connected": true,
  "authenticated": false
}
```

---

## Configuration Checklist

### `.env` File

```bash
✅ ASTERISK_HOST=192.168.1.4
✅ ASTERISK_AMI_PORT=5038  # NOT 5060/5061
✅ ASTERISK_AMI_USERNAME=admin
✅ ASTERISK_AMI_SECRET=your-password
```

### `manager.conf`

```ini
✅ [general]
✅ enabled = yes
✅ port = 5038
✅ bindaddr = 0.0.0.0

✅ [admin]
✅ secret = your-password
✅ read = all
✅ write = all
```

### Firewall

```bash
✅ TCP port 5038 open
✅ Allow app server IP
✅ No DROP rules
```

---

## Common Mistakes

### ❌ Wrong Port

```bash
# WRONG - These are SIP ports
ASTERISK_AMI_PORT=5060
ASTERISK_AMI_PORT=5061

# CORRECT - AMI port
ASTERISK_AMI_PORT=5038
```

### ❌ Username Mismatch

```bash
# .env
ASTERISK_AMI_USERNAME=admin

# manager.conf
[root]  # WRONG - doesn't match
```

### ❌ AMI Disabled

```ini
# manager.conf
[general]
enabled = no  # WRONG - must be yes
```

### ❌ Wrong Bindaddr

```ini
# manager.conf
[general]
bindaddr = 127.0.0.1  # WRONG - only local connections
```

Use:
```ini
bindaddr = 0.0.0.0  # CORRECT - all interfaces
```

---

## Quick Fix Commands

### Restart Everything

```bash
# On Asterisk server
systemctl restart asterisk

# On app server
cd apps/api
npm run dev
```

### Check Connection End-to-End

```bash
# 1. Asterisk running?
systemctl status asterisk

# 2. AMI enabled?
cat /etc/asterisk/manager.conf | grep enabled

# 3. Port open?
netstat -tlnp | grep 5038

# 4. Firewall?
iptables -L -n | grep 5038

# 5. From app server?
Test-NetConnection -ComputerName 192.168.1.4 -Port 5038

# 6. Test telnet?
telnet 192.168.1.4 5038
```

---

## Support

For more detailed information, see:
- `ASTERISK_DIAGNOSTICS_COMPLETE.md` - Full diagnostic details
- `PRODUCTION_ASTERISK_SERVICE.md` - Service implementation
- `ASTERISK_GRACEFUL_DEGRADATION.md` - Graceful degradation

**Status:** ✅ PRODUCTION READY
