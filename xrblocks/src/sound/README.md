# XR Blocks Sound SDK

Audio capture, playback, speech, and spatial sound for XR applications.

## Quick Start

Access all sound features through `core.sound`:

```javascript
export class MyScript extends xb.Script {
  async init() {
    await xb.core.sound.startRecording();
  }
}
```

## Core Features

### Recording

```javascript
await xb.core.sound.startRecording();
const pcm = xb.core.sound.stopRecording();
const sampleRate = xb.core.sound.getRecordingSampleRate();
await xb.core.sound.playRecordedAudio(pcm, sampleRate);
```

### Volume Control

```javascript
// Master volume (0.0 - 1.0)
xb.core.sound.setMasterVolume(0.8);

// Category volumes
xb.core.sound.setCategoryVolume('music', 0.5);
xb.core.sound.setCategoryVolume('sfx', 0.7);

// Mute/unmute
xb.core.sound.muteAll();
xb.core.sound.unmuteAll();
```

### Status Checking

```javascript
// Check microphone state
xb.core.sound.isAudioEnabled(); // Is microphone active?
```

## Available Modules

- **AudioListener**: Microphone capture and PCM recording
- **AudioPlayer**: PCM audio playback with queuing
- **BackgroundMusic**: Music management
- **SpatialAudio**: 3D positional audio
- **SpeechRecognizer**: Speech-to-text
- **SpeechSynthesizer**: Text-to-speech

All modules are automatically initialized and accessible through `core.sound`.
