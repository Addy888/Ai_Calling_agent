# 🏗️ Enterprise AI Calling Platform - GSM Gateway Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REACT ADMIN DASHBOARD                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Campaigns   │  │  Telephony   │  │   Health     │                  │
│  │  Management  │  │    Health    │  │  Monitoring  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTP/WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          NESTJS BACKEND API                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    TELEPHONY ENGINE MODULE                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │   Gateway    │  │     SIM      │  │  Connection  │          │  │
│  │  │   Manager    │  │   Manager    │  │   Manager    │          │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │  Asterisk    │  │   System     │  │  Asterisk    │          │  │
│  │  │   Provider   │  │ Diagnostics  │  │  AMI Service │          │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   CAMPAIGN EXECUTION MODULE                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │  Campaign    │  │    Queue     │  │   Call       │          │  │
│  │  │  Execution   │  │  Execution   │  │  Lifecycle   │          │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 AI CONVERSATION ENGINE MODULE                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │  Whisper STT │  │  Ollama LLM  │  │ Kokoro TTS   │          │  │
│  │  │  Integration │  │  Integration │  │ Integration  │          │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────┬────────────────┬─────────────────────┘
                 │                │                │
                 ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │    MySQL    │  │    Redis    │  │   BullMQ    │
       │  Database   │  │    Cache    │  │    Queue    │
       └─────────────┘  └─────────────┘  └─────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ASTERISK PBX SERVER                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AMI (Asterisk Manager Interface) - Port 5038                    │  │
│  │  • Connection pooling                                             │  │
│  │  • Event streaming                                                │  │
│  │  • Call origination                                               │  │
│  │  • Call control                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AGI (Asterisk Gateway Interface) - Port 4573                    │  │
│  │  • Audio streaming                                                │  │
│  │  • DTMF handling                                                  │  │
│  │  • Real-time interaction                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  PJSIP/SIP - Port 5060                                            │  │
│  │  • Endpoint registration                                          │  │
│  │  • Trunk management                                               │  │
│  │  • Codec negotiation                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Dialplan (extensions.conf)                                       │  │
│  │  Context: ai-calling                                              │  │
│  │  • Call routing                                                   │  │
│  │  • Recording (MixMonitor)                                         │  │
│  │  • Variable management                                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ SIP/RTP
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      GSM GATEWAY (HARDWARE)                              │
│  Model: Dinstar UC2000-VF / Yeastar TG400 / OpenVox VS-GW1202          │
│  IP: 192.168.1.100 | Port: 5060                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      GSM GATEWAY WEB UI                           │  │
│  │  • Configuration                                                  │  │
│  │  • Status monitoring                                              │  │
│  │  • SIM management                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     SIM CARD SLOTS (4-32)                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  SIM 1   │  │  SIM 2   │  │  SIM 3   │  │  SIM 4   │        │  │
│  │  │  Port 1  │  │  Port 2  │  │  Port 3  │  │  Port 4  │        │  │
│  │  │  +91...  │  │  +91...  │  │  +91...  │  │  +91...  │        │  │
│  │  │  Jio     │  │  Airtel  │  │  Vi      │  │  BSNL    │        │  │
│  │  │  ACTIVE  │  │  ACTIVE  │  │  BUSY    │  │  IDLE    │        │  │
│  │  │  Signal: │  │  Signal: │  │  Signal: │  │  Signal: │        │  │
│  │  │  ████░   │  │  █████   │  │  ███░░   │  │  ████░   │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ GSM/4G/3G/2G
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       MOBILE NETWORK (Operator)                          │
│  • Jio                                                                   │
│  • Airtel                                                                │
│  • Vi (Vodafone Idea)                                                    │
│  • BSNL                                                                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ Voice Call
                             ▼
                    ┌──────────────────┐
                    │     CUSTOMER     │
                    │   +91XXXXXXXXXX  │
                    │   Mobile Phone   │
                    └──────────────────┘
```

---

## Call Flow Sequence Diagram

```
Campaign   BullMQ    Backend    Gateway    SIM      Asterisk   GSM GW    Customer
   │         │          │        Manager   Manager      │         │          │
   │         │          │           │         │          │         │          │
   │─Start──>│          │           │         │          │         │          │
   │         │──Job────>│           │         │          │         │          │
   │         │          │──Check────>         │          │         │          │
   │         │          │    SIM              │          │         │          │
   │         │          │<─Available──────────│          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Select─────────────>          │         │          │
   │         │          │   Best SIM          │          │         │          │
   │         │          │<─SIM Info───────────│          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Mark BUSY──────────>          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Select─────>       │          │         │          │
   │         │          │   Gateway           │          │         │          │
   │         │          │<─Gateway────│       │          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Get AMI────────────────────────>        │          │
   │         │          │   Connection        │          │         │          │
   │         │          │<─AMI Ready──────────────────────│         │          │
   │         │          │                     │          │         │          │
   │         │          │──Originate──────────────────────>        │          │
   │         │          │   Channel: PJSIP/1/gsm-gateway  │        │          │
   │         │          │   CallerID: +91XXX  │          │         │          │
   │         │          │                     │          │─SIP───>│          │
   │         │          │                     │          │ INVITE  │          │
   │         │          │                     │          │         │──Dial──>│
   │         │          │                     │          │         │  +91XXX  │
   │         │          │                     │          │<─Trying─│          │
   │         │          │<─DialBegin──────────────────────│         │          │
   │         │          │   Event             │          │         │          │
   │         │          │                     │          │         │<─Ring───│
   │         │          │                     │          │<─Ringing│          │
   │         │          │<─Ringing────────────────────────│         │          │
   │         │          │                     │          │         │<─Answer─│
   │         │          │                     │          │<─200 OK─│          │
   │         │          │<─Answer─────────────────────────│         │          │
   │         │          │                     │          │──ACK───>│          │
   │         │          │                     │          │         │          │
   │         │          │<══════════ RTP Audio Stream ═══════════════════════>│
   │         │          │   (Customer Voice → Whisper STT)         │          │
   │         │          │   (Ollama LLM → Kokoro TTS → Customer)   │          │
   │         │          │   (Recorded via MixMonitor)               │          │
   │         │          │                     │          │         │          │
   │         │          │                [Conversation...]          │          │
   │         │          │                     │          │         │          │
   │         │          │──Hangup─────────────────────────>        │          │
   │         │          │                     │          │──BYE───>│          │
   │         │          │                     │          │         │──End───>│
   │         │          │<─Hangup─────────────────────────│         │          │
   │         │          │   Event             │          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Mark AVAILABLE─────>          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Decrement──>       │          │         │          │
   │         │          │   Active Ports      │          │         │          │
   │         │          │                     │          │         │          │
   │         │          │──Log Call───────────>          │         │          │
   │         │          │                     │          │         │          │
   │         │<─Complete│                     │          │         │          │
   │<─Done───│          │                     │          │         │          │
   │         │          │                     │          │         │          │
```

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE TABLES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GSMGateway                                                      │
│  ├─ id (PK)                                                      │
│  ├─ companyId (FK → Company)                                    │
│  ├─ name                                                         │
│  ├─ ipAddress                                                    │
│  ├─ port                                                         │
│  ├─ username / password                                          │
│  ├─ model / manufacturer / firmware                              │
│  ├─ totalPorts / activePorts                                     │
│  ├─ status (ACTIVE, INACTIVE, MAINTENANCE, ERROR)                │
│  ├─ isOnline (boolean)                                           │
│  ├─ lastSeenAt                                                   │
│  └─ metadata (JSON)                                              │
│                                                                  │
│  SIMCard                                                         │
│  ├─ id (PK)                                                      │
│  ├─ gatewayId (FK → GSMGateway)                                 │
│  ├─ companyId (FK → Company)                                    │
│  ├─ simNumber (Phone Number)                                     │
│  ├─ operator                                                     │
│  ├─ portNumber                                                   │
│  ├─ imsi / iccid                                                 │
│  ├─ status (ACTIVE, BUSY, ERROR, etc.)                          │
│  ├─ signal (0-100)                                               │
│  ├─ callsToday / callsThisWeek / callsThisMonth                 │
│  ├─ dailyLimit / weeklyLimit / monthlyLimit                      │
│  ├─ isActive / isPreferred / priority                            │
│  ├─ lastUsed / lastChecked                                       │
│  └─ metadata (JSON)                                              │
│                                                                  │
│  SIMCallLog                                                      │
│  ├─ id (PK)                                                      │
│  ├─ simId (FK → SIMCard)                                        │
│  ├─ companyId (FK → Company)                                    │
│  ├─ callSid                                                      │
│  ├─ campaignId / contactId                                       │
│  ├─ destinationNumber                                            │
│  ├─ callDirection (outbound/inbound)                             │
│  ├─ callStatus                                                   │
│  ├─ callDuration / callCost                                      │
│  ├─ startTime / endTime                                          │
│  └─ metadata (JSON)                                              │
│                                                                  │
│  GatewayHealthLog                                                │
│  ├─ id (PK)                                                      │
│  ├─ gatewayId (FK → GSMGateway)                                 │
│  ├─ status / isOnline / activePorts                              │
│  ├─ temperature / uptime / cpuUsage / memoryUsage               │
│  └─ checkedAt                                                    │
│                                                                  │
│  TelephonyProfile                                                │
│  ├─ id (PK)                                                      │
│  ├─ companyId (FK → Company)                                    │
│  ├─ name                                                         │
│  ├─ provider (GSM_GATEWAY, TWILIO, etc.)                        │
│  ├─ gatewayId (FK → GSMGateway)                                 │
│  ├─ simId (FK → SIMCard) - Optional preferred SIM               │
│  ├─ callerNumber                                                 │
│  ├─ isDefault / isActive                                         │
│  └─ config (JSON)                                                │
│                                                                  │
│  Campaign                                                        │
│  ├─ id (PK)                                                      │
│  ├─ telephonyProfileId (FK → TelephonyProfile)                  │
│  ├─ ... (other campaign fields)                                 │
│  └─                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## SIM Selection Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                   SIM SELECTION FLOWCHART                        │
└─────────────────────────────────────────────────────────────────┘

                        Start Call Request
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Get Company Gateways │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Select Best Gateway  │
                    │ (Health-based)       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Get Gateway's SIMs   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Filter SIMs:        │
                    │  • Is Active         │
                    │  • Not Busy          │
                    │  • Within Limits     │
                    │  • Signal > Min      │
                    └──────────┬───────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  Any SIMs?  │
                        └──┬───────┬──┘
                   No      │       │      Yes
            ┌──────────────┘       └──────────────┐
            ▼                                      ▼
     ┌──────────────┐                   ┌──────────────────┐
     │ Keep in Queue│                   │   Sort by:       │
     │ Retry Later  │                   │   • Last Used    │
     │              │                   │   • Call Count   │
     └──────────────┘                   │   • Priority     │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │ Select First SIM │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  Mark SIM BUSY   │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │ Increment Active │
                                        │  Gateway Ports   │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  Place Call via  │
                                        │    Asterisk      │
                                        └──────────────────┘
```

---

## Health Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              HEALTH MONITORING SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scheduled Tasks (Every 30-60 seconds)                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Gateway Health Check                                   │    │
│  │  ├─ Ping gateway IP                                     │    │
│  │  ├─ Check web interface                                 │    │
│  │  ├─ Verify SIP registration                             │    │
│  │  ├─ Count active ports                                  │    │
│  │  └─ Log health metrics                                  │    │
│  │                                                         │    │
│  │  SIM Health Check                                       │    │
│  │  ├─ Check signal strength                               │    │
│  │  ├─ Verify network registration                         │    │
│  │  ├─ Check usage against limits                          │    │
│  │  └─ Update status                                       │    │
│  │                                                         │    │
│  │  AMI Connection Check                                   │    │
│  │  ├─ Ping/Pong heartbeat                                 │    │
│  │  ├─ Verify authentication                               │    │
│  │  ├─ Check event streaming                               │    │
│  │  └─ Auto-reconnect if needed                            │    │
│  │                                                         │    │
│  │  AI Services Check                                      │    │
│  │  ├─ HTTP health endpoints                               │    │
│  │  ├─ Response time monitoring                            │    │
│  │  └─ Service availability                                │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │          Store in GatewayHealthLog Table               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │     Emit Events (Socket.IO to Dashboard)               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │   Update Real-Time Dashboard (Auto-refresh)            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React + TypeScript | Admin dashboard, monitoring |
| **Backend** | NestJS + TypeScript | Business logic, API |
| **Database** | MySQL + Prisma | Data persistence |
| **Queue** | Redis + BullMQ | Job queue, async processing |
| **PBX** | Asterisk | Call routing, control |
| **Hardware** | GSM Gateway | Physical SIM interface |
| **SIM Cards** | Physical SIMs | Mobile network connectivity |
| **STT** | Faster Whisper | Speech-to-text |
| **LLM** | Ollama | AI conversation |
| **TTS** | Kokoro XTTS | Text-to-speech |

---

## Network Topology

```
                    Internet
                       │
                       │
        ┌──────────────┴──────────────┐
        │   Your Network (LAN)        │
        │   Subnet: 192.168.1.0/24    │
        │                             │
        │   ┌─────────────────┐       │
        │   │  Router/Gateway │       │
        │   │  192.168.1.1    │       │
        │   └────────┬────────┘       │
        │            │                 │
        │   ┌────────┼────────┐       │
        │   │        │        │       │
        │   ▼        ▼        ▼       │
        │ [App]  [Asterisk] [GSM]     │
        │ .10      .200      .100      │
        └─────────────────────────────┘
                       │
                       │ (GSM Gateway)
                       ▼
                 Mobile Network
```

**Recommended Network Configuration:**
- Application Server: `192.168.1.10`
- Asterisk Server: `192.168.1.200`
- GSM Gateway: `192.168.1.100`
- All static IPs
- Low latency (<10ms between servers)
- Gigabit Ethernet
- Dedicated VLAN (optional)

---

This architecture provides a scalable, production-ready system for AI-powered calling using real GSM hardware!
