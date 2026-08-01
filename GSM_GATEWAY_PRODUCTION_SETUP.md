# GSM Gateway Production Setup Guide

## 🎯 Overview

This guide provides complete instructions for setting up your AI Calling Platform with a **real GSM Gateway** and **physical SIM cards**. Follow these steps to deploy a production-ready system.

---

## 📋 Prerequisites

### Hardware Requirements

1. **GSM Gateway Device**
   - Supported Models:
     - Dinstar (UC2000-VE, UC2000-VF, DAG2500)
     - Yeastar (TG100, TG200, TG400, TG800)
     - OpenVox (VS-GW1202, VS-GW2120)
     - Synway (SMG4000 series)
     - Portech (MV-370, MV-372)
   - Minimum 4 ports (supports up to 32 ports)
   - Firmware updated to latest stable version

2. **Physical SIM Cards**
   - Minimum: 3 SIM cards
   - Recommended: 1 per port for optimal performance
   - Active mobile plans with:
     - Outbound calling enabled
     - Sufficient balance/credit
     - No daily/monthly call limits (or high limits)

3. **Asterisk PBX Server**
   - Version: 18.x or 20.x (LTS recommended)
   - Operating System: Ubuntu 20.04/22.04 LTS or CentOS 7/8
   - Minimum: 4 CPU cores, 8GB RAM, 100GB storage
   - Network: Static IP address, low-latency connection to GSM Gateway

### Software Requirements

- Node.js 18+ 
- MySQL 8.0+
- Redis 6.0+
- Faster Whisper STT service
- Ollama LLM
- Kokoro TTS

---

## 🔧 Step 1: GSM Gateway Hardware Setup

### 1.1 Physical Installation

1. **Unbox and inspect** the GSM Gateway
2. **Insert SIM cards** into available ports
3. **Connect power supply** (ensure stable power with UPS backup)
4. **Connect Ethernet cable** to your network
5. **Verify LED indicators**:
   - Power LED: Solid green
   - Network LED: Blinking (indicates network activity)
   - SIM LEDs: Solid green (SIM registered to network)

### 1.2 Network Configuration

1. **Assign Static IP** to GSM Gateway
   ```
   Gateway IP: 192.168.1.100 (example)
   Subnet: 255.255.255.0
   Gateway: 192.168.1.1
   DNS: 8.8.8.8, 8.8.4.4
   ```

2. **Access Web Interface**
   - Open browser: `http://192.168.1.100`
   - Default credentials (check your model):
     - Dinstar: admin/admin
     - Yeastar: admin/admin
     - OpenVox: admin/admin

3. **Change Default Password** (security requirement)

### 1.3 SIM Card Configuration

For each SIM card:

1. **Check Registration Status**
   - Navigate to: Status → GSM Status
   - Verify: "Registered" or "Home Network"

2. **Configure Call Settings**
   - Enable: Outbound Calls
   - Disable: Call Waiting, Call Forwarding (if not needed)
   - Set: Preferred Network (4G/3G/2G priority)

3. **Note SIM Details**
   - Phone Number
   - IMSI (International Mobile Subscriber Identity)
   - ICCID (SIM Card ID)
   - Signal Strength

### 1.4 VoIP/SIP Configuration

Configure SIP trunks for Asterisk integration:

**For Dinstar:**
```
Protocol: SIP
SIP Port: 5060
RTP Port Range: 10000-20000
Transport: UDP
Codec Priority: PCMU, PCMA, G729
DTMF: RFC2833
NAT Traversal: Enabled
```

**For Yeastar:**
```
Account Name: asterisk-trunk
Username: asterisk
Password: [secure-password]
Authentication: Digest
Registration: Not Required (IP-based authentication)
```

---

## 🖥️ Step 2: Asterisk PBX Setup

### 2.1 Install Asterisk

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y asterisk asterisk-modules asterisk-config

# Verify installation
asterisk -V

# Start Asterisk
sudo systemctl start asterisk
sudo systemctl enable asterisk
```

### 2.2 Configure SIP/PJSIP

Edit `/etc/asterisk/pjsip.conf`:

```ini
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

[gsm-gateway]
type=endpoint
context=ai-calling
transport=transport-udp
aors=gsm-gateway
allow=!all,ulaw,alaw
direct_media=no
from_domain=192.168.1.200

[gsm-gateway]
type=aor
contact=sip:admin@192.168.1.100:5060

[gsm-gateway]
type=identify
endpoint=gsm-gateway
match=192.168.1.100
```

### 2.3 Configure Dialplan

Edit `/etc/asterisk/extensions.conf`:

```ini
[ai-calling]
exten => _X.,1,NoOp(AI Calling Platform)
    same => n,Set(CHANNEL(language)=en)
    same => n,Set(CALL_ID=${EXTEN})
    same => n,Set(GATEWAY_ID=${GSM_GATEWAY_ID})
    same => n,Set(SIM_ID=${SIM_ID})
    same => n,MixMonitor(${CALL_ID}.wav,b)
    same => n,AGI(agi://localhost:4573)
    same => n,Hangup()

exten => h,1,NoOp(Call Ended)
    same => n,Set(DURATION=${CDR(duration)})
    same => n,System(curl -X POST http://localhost:3001/api/v1/telephony/webhook/call-ended \
         -H "Content-Type: application/json" \
         -d '{"callId":"${CALL_ID}","duration":"${DURATION}"}')
```

### 2.4 Configure AMI (Asterisk Manager Interface)

Edit `/etc/asterisk/manager.conf`:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = your-secure-ami-password
read = all
write = all
```

### 2.5 Reload Asterisk Configuration

```bash
asterisk -rx "core reload"
asterisk -rx "pjsip reload"
asterisk -rx "dialplan reload"
```

---

## ⚙️ Step 3: Application Configuration

### 3.1 Update `.env` File

```bash
cd /path/to/ai-calling-agent
cp .env.example .env
nano .env
```

Configure Asterisk settings:

```env
# Asterisk AMI
ASTERISK_HOST=192.168.1.200
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your-secure-ami-password
ASTERISK_AMI_EVENTS=on

# Asterisk AGI
ASTERISK_AGI_HOST=192.168.1.200
ASTERISK_AGI_PORT=4573

# Asterisk Context
ASTERISK_CONTEXT=ai-calling
ASTERISK_EXTENSION=s

# Active Provider
TELEPHONY_ENGINE_PROVIDER=asterisk

# Call Settings
CALL_TIMEOUT_SECONDS=60
CALL_RING_TIMEOUT_SECONDS=30
TELEPHONY_ENGINE_RECORDING_ENABLED=true
TELEPHONY_ENGINE_MAX_CONCURRENT_CALLS=10
```

### 3.2 Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## 🗄️ Step 4: Register GSM Gateway in Database

### 4.1 Using Admin Dashboard

1. Navigate to: **Dashboard → Telephony → Gateways**
2. Click: **"Add New Gateway"**
3. Fill in details:
   ```
   Gateway Name: GSM Gateway 1
   Model: Dinstar UC2000-VF
   Manufacturer: Dinstar
   IP Address: 192.168.1.100
   Port: 5060
   Username: admin
   Password: [your-password]
   Total Ports: 4
   ```
4. Click: **"Save Gateway"**

### 4.2 Using API

```bash
curl -X POST http://localhost:3001/api/v1/telephony/gateways \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "name": "GSM Gateway 1",
    "ipAddress": "192.168.1.100",
    "port": 5060,
    "username": "admin",
    "password": "your-password",
    "model": "Dinstar UC2000-VF",
    "manufacturer": "Dinstar",
    "totalPorts": 4
  }'
```

---

## 📱 Step 5: Register SIM Cards

### 5.1 Using Admin Dashboard

1. Navigate to: **Dashboard → Telephony → SIM Cards**
2. For each SIM, click: **"Add SIM Card"**
3. Fill in details:
   ```
   SIM Number: +919876543210
   Operator: Jio
   Port Number: 1
   IMSI: 404451234567890
   ICCID: 89914902XXXXXXXXXX
   Daily Limit: 100 calls
   Weekly Limit: 700 calls
   Monthly Limit: 3000 calls
   ```

### 5.2 Verify SIM Registration

```bash
# Check from Asterisk CLI
asterisk -rx "pjsip show endpoints"
asterisk -rx "pjsip show aors"

# Expected output:
# Endpoint: gsm-gateway/+919876543210 Unavailable 0 of inf
```

---

## 🧪 Step 6: System Diagnostics

### 6.1 Run Diagnostics from Dashboard

1. Navigate to: **Dashboard → Telephony Health**
2. Click: **"Run Diagnostics"**
3. Verify all components show **GREEN** status:
   - ✓ MySQL Database
   - ✓ Redis Cache
   - ✓ Asterisk AMI
   - ✓ GSM Gateways (Online)
   - ✓ SIM Cards (Active)
   - ✓ Faster Whisper STT
   - ✓ Ollama LLM
   - ✓ Kokoro TTS

### 6.2 Manual Connectivity Tests

**Test 1: AMI Connection**
```bash
telnet 192.168.1.200 5038
# Should connect and show Asterisk greeting
```

**Test 2: SIP Registration**
```bash
asterisk -rx "pjsip show registrations"
```

**Test 3: Make Test Call**
```bash
# From Asterisk CLI
asterisk -rvvv
originate PJSIP/1/gsm-gateway/+919876543210 application Playback demo-congrats
```

---

## 🚀 Step 7: Create First Campaign

### 7.1 Setup Campaign

1. **Navigate to:** Dashboard → Campaigns
2. **Click:** "Create Campaign"
3. **Fill in:**
   - Campaign Name: "Test Campaign"
   - Script: Select or create a script
   - Telephony Profile: Select GSM Gateway profile
   - Concurrent Calls: 3 (one per SIM)

### 7.2 Upload Contacts

1. **Prepare CSV:**
   ```csv
   firstName,lastName,phone,email
   John,Doe,+919876543211,john@example.com
   Jane,Smith,+919876543212,jane@example.com
   ```

2. **Upload:** Click "Upload Contacts" → Select CSV

### 7.3 Start Campaign

1. **Review:** Contacts loaded, SIMs available
2. **Click:** "Start Campaign"
3. **Monitor:** Real-time call status in dashboard

---

## 📊 Step 8: Monitoring & Maintenance

### 8.1 Real-Time Monitoring

- **Dashboard:** Monitor active calls, SIM status, gateway health
- **Logs:** `/var/log/asterisk/full`
- **Recordings:** `/var/spool/asterisk/monitor/`

### 8.2 Health Checks

Configure automated health checks:

```bash
# Add to crontab
*/5 * * * * curl -X GET http://localhost:3001/api/v1/telephony/health/overview
```

### 8.3 Daily Maintenance

- Check SIM signal strength
- Verify gateway connectivity
- Review call logs for failures
- Monitor SIM usage against daily limits

---

## 🔒 Security Considerations

### Network Security

1. **Firewall Rules:**
   ```bash
   # Allow only necessary ports
   ufw allow 5060/udp  # SIP
   ufw allow 10000:20000/udp  # RTP
   ufw allow 5038/tcp  # AMI (internal only)
   ```

2. **VPN:** Use VPN for remote access to Asterisk AMI

3. **Change Default Passwords:** All devices, Asterisk users

### SIM Security

- Enable PIN lock on SIM cards
- Monitor for unusual call patterns
- Set daily/monthly spending limits

---

## 🐛 Troubleshooting

### Gateway Not Connecting

**Symptom:** Gateway shows offline in dashboard

**Solutions:**
1. Ping gateway: `ping 192.168.1.100`
2. Check network connectivity
3. Verify gateway web interface accessible
4. Check firewall rules

### SIM Not Registering

**Symptom:** SIM shows "ERROR" status

**Solutions:**
1. Check SIM insertion (remove and reinsert)
2. Verify SIM has active plan
3. Check operator coverage
4. Restart GSM Gateway

### Calls Not Connecting

**Symptom:** Calls fail with "CHANUNAVAIL"

**Solutions:**
1. Check Asterisk logs: `tail -f /var/log/asterisk/full`
2. Verify PJSIP configuration
3. Check SIM availability
4. Test manual originate from Asterisk CLI

### Poor Audio Quality

**Symptom:** Garbled audio, choppy voice

**Solutions:**
1. Check network latency: `ping 192.168.1.100`
2. Increase RTP packet size
3. Change codec to PCMU
4. Check for network congestion

---

## 📞 Support & Resources

### Official Documentation

- Asterisk: https://wiki.asterisk.org/
- Dinstar: https://www.dinstar.com/support/
- Yeastar: https://www.yeastar.com/support/

### Community Forums

- Asterisk Forums: https://community.asterisk.org/
- VoIP-Info: https://www.voip-info.org/

### Professional Support

For production deployment assistance, contact:
- Email: support@your-company.com
- Phone: +91-XXXXXXXXXX

---

## ✅ Production Checklist

Before going live, verify:

- [ ] GSM Gateway configured and online
- [ ] All SIM cards registered to network
- [ ] Asterisk AMI connection successful
- [ ] PJSIP endpoints registered
- [ ] Test calls complete successfully
- [ ] Call recording working
- [ ] Transcription service operational
- [ ] AI conversation engine responding
- [ ] Database backups configured
- [ ] Monitoring alerts configured
- [ ] Security hardening complete
- [ ] Load testing performed
- [ ] Disaster recovery plan documented

---

## 🎉 Congratulations!

Your AI Calling Platform is now ready for production use with real GSM hardware. The system will automatically:

✓ Select available SIM cards  
✓ Place calls through GSM Gateway  
✓ Conduct AI-powered conversations  
✓ Record and transcribe calls  
✓ Generate analytics  

**Next Steps:**
1. Create your first production campaign
2. Monitor system performance
3. Optimize based on metrics
4. Scale by adding more SIM cards/gateways

For questions or issues, refer to the troubleshooting section or contact support.
