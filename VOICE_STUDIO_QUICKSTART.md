# Voice Studio Quick Start Guide

## Getting Started with Voice Studio

### Prerequisites
- Backend server running
- Frontend application running
- User authenticated with valid JWT token
- Database migrations applied

### Step 1: Seed Voice Provider

Run the seeder to add the default Kokoro TTS provider:

```bash
cd apps/api
npx ts-node src/database/seeders/voice-providers.seeder.ts
```

### Step 2: Access Voice Studio

1. Open your browser and navigate to the dashboard
2. Go to **AI Agents**
3. Click on any agent to view details
4. Click on the **"Voice Studio"** tab

### Step 3: Add Voices to Library

1. In Voice Studio, you'll see 4 sub-tabs
2. Make sure you're on the **"Voice Library"** tab
3. Click **"Add Voice"** button
4. Select:
   - **Provider**: Kokoro TTS
   - **Language**: English / Hindi / Marathi
   - **Gender**: Male / Female
   - **Voice**: Choose from available voices
5. Click **"Add Voice"**

**Recommended Setup:**
- Add one English Male voice (e.g., am_adam)
- Add one English Female voice (e.g., af_bella)
- Add one Hindi Male voice (e.g., hi_raj)
- Add one Hindi Female voice (e.g., hi_priya)
- Add one Marathi Male voice (e.g., mr_suresh)
- Add one Marathi Female voice (e.g., mr_anita)

### Step 4: Set Active Voices

For each language and gender combination:
1. Click the **circle icon** next to the voice you want to activate
2. It will change to a **green checkmark** indicating it's active
3. Only ONE voice can be active per language+gender combination

### Step 5: Configure Voice Settings

1. Go to the **"Settings"** tab
2. Adjust the sliders:
   - **Speaking Speed**: How fast the voice speaks (1.0 = normal)
   - **Pitch**: Voice pitch (1.0 = normal)
   - **Volume**: Output volume (1.0 = 100%)
   - **Pause Between Sentences**: Milliseconds pause
   - **Pause Between Paragraphs**: Milliseconds pause
   - **Voice Temperature**: Voice variation (0.7 = balanced)
3. Click **"Save Settings"**

### Step 6: Generate Your First Voice

1. Go to the **"Preview"** tab
2. Select a voice from the dropdown
3. Enter text or click a **"Sample"** button for quick text
4. Click **"Generate Voice"**
5. Wait for the progress bar to complete
6. Use the player controls:
   - **Play**: Start audio playback
   - **Pause**: Pause playback
   - **Stop**: Stop and reset playback
   - **Download**: Save audio file

### Step 7: View History

1. Go to the **"History"** tab
2. Filter by:
   - Language
   - Gender
   - Status
3. View all generated voices with details
4. Play or download previous generations

## Sample Texts for Testing

### English
```
Hello, thank you for your time. I would like to tell you about our latest property project.
```

### Hindi
```
नमस्ते, आपके समय के लिए धन्यवाद। मैं आपको हमारे नवीनतम परियोजना के बारे में बताना चाहता हूं।
```

### Marathi
```
नमस्कार, तुमच्या वेळेबद्दल धन्यवाद। मी तुम्हाला आमच्या नवीनतम प्रकल्पाबद्दल सांगू इच्छितो।
```

## API Usage Examples

### Generate Voice via API

```bash
curl -X POST http://localhost:3000/api/voice-studio/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Hello world",
    "language": "en",
    "gender": "FEMALE",
    "saveToHistory": true
  }'
```

### Get Voice Configuration

```bash
curl -X GET http://localhost:3000/api/voice-studio/configuration \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Available Voices

```bash
curl -X GET http://localhost:3000/api/voice-studio/voices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Integration

```bash
curl -X POST http://localhost:3000/api/voice-studio/integration/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## WebSocket Integration

### Connect to Voice Studio Gateway

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/voice-studio', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Listen for events
socket.on('voice:progress', (data) => {
  console.log('Progress:', data.progress, '%');
});

socket.on('voice:ready', (data) => {
  console.log('Audio ready:', data.audio);
  // data.audio is base64 encoded WAV
});

socket.on('voice:error', (data) => {
  console.error('Error:', data.message);
});

// Generate voice
socket.emit('voice:generate', {
  companyId: 'YOUR_COMPANY_ID',
  text: 'Hello world',
  voiceId: 'VOICE_UUID',
  saveToHistory: true
});
```

## AI Brain Integration

### From Prompt Engine

```typescript
import { VoiceBrainIntegrationService } from './services/voice-brain-integration.service';

// In your service
const voiceResult = await this.voiceBrainIntegration.generateVoiceFromPromptResponse(
  agentId,
  sessionId,
  'AI generated response text',
  {
    language: 'en',
    gender: 'FEMALE',
    saveToHistory: true
  }
);

// voiceResult contains: audio (base64), duration, format, voice details
```

### From Script Engine

```typescript
const voiceResult = await this.voiceBrainIntegration.generateVoiceFromScriptNode(
  agentId,
  sessionId,
  'Script content with {{variables}}',
  {
    variables: { name: 'John' },
    language: 'hi',
    gender: 'MALE'
  }
);
```

### From Conversation Manager

```typescript
const voiceResult = await this.voiceBrainIntegration.generateVoiceFromConversation(
  agentId,
  sessionId,
  conversationResponse
);
// Automatically detects language from text
```

## Troubleshooting

### Issue: No voices in library
**Solution:** Run the voice provider seeder and add voices manually

### Issue: Voice generation fails
**Solution:** 
- Check if active voice exists for language+gender
- Verify voice configuration is saved
- Check provider health endpoint

### Issue: Audio doesn't play
**Solution:**
- Check browser console for errors
- Verify audio format support (WAV)
- Check if audio data is base64 encoded properly

### Issue: WebSocket connection fails
**Solution:**
- Verify backend server is running
- Check CORS configuration
- Ensure proper JWT token in auth

## Best Practices

1. **Always set active voices** for all language+gender combinations you plan to use
2. **Save configuration** after adjusting settings
3. **Test with sample texts** before using with AI responses
4. **Monitor history** to track voice generation usage
5. **Use appropriate language** for target audience
6. **Adjust speaking speed** based on content complexity
7. **Configure pauses** for better natural speech flow

## Support

For issues or questions:
1. Check the implementation documentation: `VOICE_STUDIO_IMPLEMENTATION.md`
2. Review the complete status: `PHASE_4.2_COMPLETE.md`
3. Check API documentation at: `http://localhost:3000/api/docs`

## Next Features (Coming Soon)

- Voice cloning
- Custom voice training
- Speech-to-Text
- Live calling integration
- Advanced audio effects
- Multi-voice conversations
