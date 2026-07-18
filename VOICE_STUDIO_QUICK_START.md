# Voice Studio Quick Start Guide

## 🚀 Getting Started

### 1. Database Setup
```bash
# Run Prisma migrations to create Voice Studio tables
cd database
npx prisma migrate dev --name add_voice_studio
npx prisma generate
```

### 2. Seed Voice Providers
```bash
# Seed default Kokoro TTS provider (if seeder exists)
npm run seed
```

### 3. Start Backend
```bash
cd apps/api
npm run start:dev

# Verify Voice Studio endpoints are registered:
# - GET /api/v1/voice-studio/providers
# - GET /api/v1/voice-studio/voices
# - POST /api/v1/voice-studio/preview
```

### 4. Start Frontend
```bash
cd apps/web
npm run dev

# Access Voice Studio at:
# http://localhost:3000/dashboard/ai-agents/[agent-id]
# Navigate to "Voice Studio" tab
```

---

## 📍 Navigation

### Accessing Voice Studio
1. Login to the application
2. Navigate to **Dashboard → AI Agents**
3. Click on any AI Agent to view details
4. Click the **"Voice Studio"** tab
5. Use the 4 sub-tabs:
   - **Library:** Manage voices
   - **Settings:** Configure voice parameters
   - **Preview:** Test voices with custom text
   - **History:** View generation history

---

## 🎯 Common Tasks

### Task 1: Add a New Voice
```typescript
// Frontend: Voice Library component
const addVoice = async () => {
  const response = await fetch('/api/v1/voice-studio/voices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      providerId: 'kokoro-tts-provider-id',
      name: 'John',
      language: 'en',
      gender: 'MALE',
      voiceCode: 'en-US-male-3',
      description: 'Professional male voice',
      isActive: true
    })
  });
  
  const newVoice = await response.json();
  console.log('Voice created:', newVoice);
};
```

### Task 2: Set Active Voice
```typescript
// Only one voice per language-gender combination can be active
const setActiveVoice = async (voiceId: string) => {
  await fetch('/api/v1/voice-studio/voices/set-active', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ voiceId })
  });
};
```

### Task 3: Preview a Voice
```typescript
const previewVoice = async () => {
  const response = await fetch('/api/v1/voice-studio/preview', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      voiceId: 'voice-id-here',
      text: 'Hello, this is a test of the voice preview system.',
      saveToHistory: false
    })
  });
  
  const result = await response.json();
  // result.audio contains base64 encoded audio
  // result.duration contains duration in milliseconds
  
  // Play the audio
  const audio = new Audio(`data:audio/mp3;base64,${result.audio}`);
  audio.play();
};
```

### Task 4: Update Voice Settings
```typescript
const updateSettings = async () => {
  await fetch('/api/v1/voice-studio/configuration', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      speakingSpeed: 1.2,              // 0.5 to 2.0
      pitch: 5,                        // -20 to +20
      volume: 0.9,                     // 0.0 to 1.0
      pauseBetweenSentences: 400,      // milliseconds
      pauseBetweenParagraphs: 700      // milliseconds
    })
  });
};
```

### Task 5: Generate Voice from AI Response
```typescript
// Backend: In your AI agent response handler
import { VoiceBrainIntegrationService } from './services/voice-brain-integration.service';

@Injectable()
export class YourAIService {
  constructor(
    private readonly voiceBrainIntegration: VoiceBrainIntegrationService
  ) {}
  
  async processAIResponse(agentId: string, sessionId: string, aiResponse: string) {
    // Generate voice automatically from AI response
    const voiceResult = await this.voiceBrainIntegration.generateVoiceFromPromptResponse(
      agentId,
      sessionId,
      aiResponse,
      {
        language: 'en',
        gender: 'FEMALE',
        saveToHistory: true
      }
    );
    
    return {
      text: aiResponse,
      audio: voiceResult.audio,
      duration: voiceResult.duration,
      voice: voiceResult.voice
    };
  }
}
```

---

## 🔧 Configuration

### Environment Variables
```bash
# .env file (if needed for external TTS providers)
KOKORO_TTS_API_KEY=your_api_key_here
KOKORO_TTS_API_ENDPOINT=https://api.kokoro-tts.example.com
```

### Voice Provider Configuration
```typescript
// Kokoro TTS Provider settings (in database)
{
  name: "Kokoro TTS",
  type: "kokoro",
  apiEndpoint: "https://api.kokoro-tts.example.com",
  apiKey: "encrypted_key",
  isActive: true,
  config: {
    defaultFormat: "mp3",
    sampleRate: 22050,
    bitRate: 128
  }
}
```

---

## 🎤 Available Voices

### English (en)
| Voice Name | Gender | Code | Description |
|------------|--------|------|-------------|
| James | Male | en-US-male-1 | Professional male voice |
| Michael | Male | en-US-male-2 | Friendly male voice |
| Sarah | Female | en-US-female-1 | Professional female voice |
| Emma | Female | en-US-female-2 | Friendly female voice |

### Hindi (hi)
| Voice Name | Gender | Code | Description |
|------------|--------|------|-------------|
| Raj | Male | hi-IN-male-1 | Professional male voice |
| Arjun | Male | hi-IN-male-2 | Friendly male voice |
| Priya | Female | hi-IN-female-1 | Professional female voice |
| Anjali | Female | hi-IN-female-2 | Friendly female voice |

### Marathi (mr)
| Voice Name | Gender | Code | Description |
|------------|--------|------|-------------|
| Shivaji | Male | mr-IN-male-1 | Professional male voice |
| Ganesh | Male | mr-IN-male-2 | Friendly male voice |
| Radha | Female | mr-IN-female-1 | Professional female voice |
| Gauri | Female | mr-IN-female-2 | Friendly female voice |

---

## 🔌 WebSocket Events

### Subscribing to Events
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: localStorage.getItem('token') }
});

// Listen for voice generation progress
socket.on('voice:generation:progress', (data) => {
  console.log('Progress:', data.progress, '%');
});

// Listen for voice generation complete
socket.on('voice:generation:complete', (data) => {
  console.log('Audio ready:', data.audio);
  // Play audio
});

// Listen for errors
socket.on('voice:generation:error', (error) => {
  console.error('Generation failed:', error.message);
});

// Listen for preview ready
socket.on('voice:preview:ready', (data) => {
  console.log('Preview ready:', data);
});
```

---

## 🐛 Troubleshooting

### Issue: Voices not loading
**Solution:**
1. Check if backend is running: `GET /api/v1/voice-studio/providers`
2. Verify JWT token is valid
3. Check browser console for errors
4. Verify Prisma migrations are applied

### Issue: Voice preview not playing
**Solution:**
1. Check if audio data is returned (base64 string)
2. Verify browser supports audio playback
3. Check browser console for audio errors
4. Ensure volume is not muted

### Issue: No active voice found
**Solution:**
1. Go to Voice Library
2. Select a voice
3. Click "Set as Active"
4. Retry voice generation

### Issue: WebSocket not connecting
**Solution:**
1. Verify WebSocket URL is correct
2. Check if JWT token is included in auth
3. Verify backend WebSocket gateway is running
4. Check CORS settings

### Issue: Permission denied
**Solution:**
1. Verify user is authenticated
2. Check if user belongs to the correct company
3. Verify JWT token includes companyId
4. Check RBAC permissions (if enabled)

---

## 📊 Monitoring & Logs

### Backend Logs
```bash
# View voice generation logs
[VoiceStudioService] Generating voice for company: xyz...
[VoiceBrainIntegrationService] Generating voice for agent abc, session 123
[VoiceStudioService] Voice generated successfully: Sarah (2500ms)
```

### Frontend Console
```javascript
// Enable debug mode
localStorage.setItem('DEBUG_VOICE_STUDIO', 'true');

// View debug logs in browser console
[VoiceLibrary] Fetching voices...
[VoiceLibrary] Voices loaded: 12
[VoicePreview] Generating preview for voice: Sarah
[VoicePreview] Preview ready: 2.5s audio
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create new voice
- [ ] List all voices
- [ ] Update voice settings
- [ ] Delete voice
- [ ] Set active voice
- [ ] Generate voice preview
- [ ] Play voice audio
- [ ] View voice history
- [ ] Update voice configuration
- [ ] Test multi-language support
- [ ] Test gender-specific voices
- [ ] Test WebSocket events

### API Testing with cURL
```bash
# Get all voices
curl -X GET http://localhost:3001/api/v1/voice-studio/voices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Generate preview
curl -X POST http://localhost:3001/api/v1/voice-studio/preview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "voiceId": "voice-id-here",
    "text": "Hello, this is a test.",
    "saveToHistory": false
  }'

# Get configuration
curl -X GET http://localhost:3001/api/v1/voice-studio/configuration \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📚 Additional Resources

### Documentation
- [Full Implementation Guide](./PHASE_4.2_VOICE_STUDIO_COMPLETE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [AI Brain Integration](./AI_BRAIN_INTEGRATION.md)

### Code References
- Voice Studio Controller: `apps/api/src/modules/ai-agent/voice-studio.controller.ts`
- Voice Studio Service: `apps/api/src/modules/ai-agent/services/voice-studio.service.ts`
- Voice Brain Integration: `apps/api/src/modules/ai-agent/services/voice-brain-integration.service.ts`
- Voice Library Component: `apps/web/src/components/voice-studio/voice-library.tsx`

### Support
For issues or questions:
1. Check this Quick Start Guide
2. Review the complete documentation
3. Check backend logs for errors
4. Verify database migrations are applied
5. Test API endpoints with cURL

---

*Quick Start Guide Version: 1.0*  
*Last Updated: Phase 4.2 Completion*  
*Status: Production Ready ✅*
