# MQTT Security Configuration Guide

## Overview

This document explains how to configure MQTT credentials safely for SmartHomeApp. Credentials are no longer hardcoded in the app source code. Instead, they are loaded from environment variables using `react-native-config`.

## ⚠️ Important Security Notes

**NEVER commit real credentials to Git.**
- `.env` file is in `.gitignore` and will not be committed
- `.env.example` shows the template (safe to commit)
- Real broker credentials must be in your local `.env` file only

## Setup Instructions

### 1. Install Dependencies

`react-native-config` is already installed. If needed:

```bash
npm install react-native-config --save
```

### 2. Create Local .env File

Copy `.env.example` to `.env`:

```bash
# On macOS/Linux
cp .env.example .env

# On Windows
copy .env.example .env
```

### 3. Edit .env with Real Credentials

Open `.env` in your editor and fill in your MQTT broker details:

```env
MQTT_URL=wss://your-broker-url.com:8884/mqtt
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_CLIENT_ID_PREFIX=smartapp
```

### 4. Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MQTT_URL` | Yes | WebSocket URL (ws:// or wss://) | `wss://broker.hivemq.cloud:8884/mqtt` |
| `MQTT_USERNAME` | Yes | MQTT broker username | `bluetooth` |
| `MQTT_PASSWORD` | Yes | MQTT broker password | `Ble_12345` |
| `MQTT_CLIENT_ID_PREFIX` | No | Prefix for generated client IDs | `smartapp` (default) |

### 5. After Changing .env

**For Android:**
```bash
npm run android
```

**For iOS:**
```bash
npm run ios
```

⚠️ **Important**: After modifying `.env`, you must rebuild the app for changes to take effect. The React Native build process bundles environment variables at compile time.

## Architecture

### Configuration Flow

```
.env (local, not committed)
  ↓
react-native-config
  ↓
src/config/mqttConfig.ts (getMQTTConfig())
  ↓
App.tsx (Uses getMQTTConfig() at startup)
  ↓
mqttService.connect(config)
```

### How It Works

1. **Development**: App reads from local `.env` file
2. **Configuration Service**: `src/config/mqttConfig.ts` validates and retrieves config
3. **Sanitized Logging**: Passwords are masked in console logs
4. **Error Handling**: Missing config logs warnings but allows app to continue

## Security Features

### ✅ What's Protected

- **MQTT Password**: Never hardcoded in source
- **MQTT URL**: Never hardcoded in source
- **Client ID**: Generated dynamically with timestamp + random
- **Console Output**: Passwords masked in logs (e.g., `blu****`)

### ⚠️ What's Still Needed

This phase only removes hardcoded credentials. For production:

- [ ] Implement encrypted storage for credentials
- [ ] Add per-device API tokens
- [ ] Implement BLE provisioning PIN verification
- [ ] Add input validation on device commands
- [ ] Set up backend OAuth/token service

## File Structure

```
SmartHomeApp/
├── .env                          (local, NOT committed - add your credentials here)
├── .env.example                  (template, safe to commit)
├── .gitignore                    (includes .env)
├── src/
│   └── config/
│       └── mqttConfig.ts         (config service - validates and retrieves config)
└── App.tsx                       (uses getMQTTConfig() at startup)
```

## Verification

### Verify Setup

1. Check that real password is in `.env`:
   ```bash
   cat .env
   ```

2. Check that real password is NOT in source code:
   ```bash
   git grep "Ble_12345"              # Should return nothing
   git grep "b01052fb9a1942c19262"   # Should return nothing
   ```

3. Check that `.env` is ignored:
   ```bash
   git status
   ```
   `.env` should NOT appear in the output.

4. Check that configuration loads:
   - Look at app console logs when starting
   - Should see: `[MQTT Config] Configuration loaded: { url: 'wss://...', username: 'blu****', ... }`

### TypeScript Check

```bash
npx tsc --noEmit
```

Should complete with no errors.

## Troubleshooting

### Issue: "Cannot find module 'react-native-config'"

**Solution**: Install the package and rebuild:
```bash
npm install react-native-config --save
npm run android    # or ios
```

### Issue: MQTT Connection Failed

**Check**:
1. `.env` file exists and has all required variables
2. MQTT URL is correct (should start with `ws://` or `wss://`)
3. Credentials are correct (username, password)
4. Broker is accessible from your network

Check app console:
```
[MQTT Config] Configuration loaded: {...}
[App] Connecting to MQTT broker...
```

### Issue: .env Changes Not Taking Effect

**Solution**: Rebuild the app. Changes in `.env` are bundled at build time:
```bash
npm run android    # Rebuild for Android
npm run ios        # Rebuild for iOS
```

## Best Practices

1. **Never commit `.env`** - It's in `.gitignore`
2. **Use `.env.example`** - Share template with team
3. **Use different credentials per environment** - dev, staging, production
4. **Rotate passwords regularly** - Change MQTT_PASSWORD periodically
5. **Use strong passwords** - MQTT_PASSWORD should be complex
6. **Document setup** - New developers should follow this guide

## What's Next?

After MQTT credentials are secured:

1. **PHASE SECURITY-1**: Implement encrypted AsyncStorage for WiFi credentials
2. **PHASE SECURITY-2**: Add BLE provisioning PIN verification
3. **PHASE SECURITY-3**: Implement per-device API tokens
4. **PHASE SECURITY-4**: Add backend authentication layer

## References

- [react-native-config Documentation](https://github.com/lugg/react-native-config)
- [MQTT Security Best Practices](https://mqtt.org/general/security)
- [HiveMQ Authentication](https://www.hivemq.com/mqtt-authentication/)

---

**Last Updated**: June 2026
**Phase**: SECURITY-0 - MQTT Credential Configuration
**Status**: Implementation Complete
