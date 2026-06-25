---
inclusion: always
---

# SmartHomeApp Documentation Index

## 📚 Master Documentation

### **CONSOLIDATED.md** - Complete Reference
**Single comprehensive document containing:**
- Architecture Overview (layers, patterns, components)
- Technology Stack (all dependencies, versions, configurations)
- Data Model & Structure (Firebase, MQTT, storage, caching)
- App Workflows (13 detailed workflows from auth to device control)
- Implementation Guide (code organization, development workflow, security)

**Start here:** Read this one document for complete understanding.

---

## Quick Navigation by Topic

### 🏗️ Architecture
**See CONSOLIDATED.md sections:**
- System Architecture Layers
- Key Components
- Core Architectural Patterns (5 core patterns explained)

### 📱 Tech Stack
**See CONSOLIDATED.md sections:**
- Technology Stack (all tools and versions)
- Build Commands & Configuration
- Environment Setup

### 💾 Data Model
**See CONSOLIDATED.md sections:**
- Data Hierarchy
- Firebase Firestore Collections (Users, Homes, Rooms, Devices)
- MQTT Communication Structure
- Local Storage & Caching
- Firestore Security Rules

### 🔄 Workflows
**See CONSOLIDATED.md sections:**
- 1. Authentication Flow
- 2. Login / Signup / OTP
- 3. Home & Room Management
- 4. Add New Device (BLE Provisioning) ⭐ **MOST CRITICAL**
- 5. Real-Time Device Control
- 6. Offline / Online Detection
- 7. Device Management
- 8. Device Details Screen
- 9. Notifications
- 10. Profile Screen
- 11. Settings Screen

### 💻 Implementation
**See CONSOLIDATED.md sections:**
- Code Organization (folder structure)
- Development Workflow (setup, development, testing)
- Performance Optimization (caching, network, UI)
- Security Best Practices

---

## 🎯 Reading Guide by Role

### For New Developers
1. Read Architecture Overview (understand layers)
2. Read Technology Stack (know the tools)
3. Read 1 App Workflow (understand data flow)
4. Read Code Organization (navigate the codebase)

### For Backend Developers
1. Read Data Model & Structure
2. Read MQTT Communication Structure
3. Read Firestore Security Rules
4. Read Implementation Guide

### For UI/Frontend Developers
1. Read Screen Hierarchy Summary
2. Read App Workflows 1-11
3. Read Code Organization (screens folder)
4. Read Theme & Styling section

### For DevOps/Infrastructure
1. Read Technology Stack
2. Read Environment Configuration
3. Read Build Commands
4. Read Firebase Services section

### For Project Managers
1. Read Architecture Overview
2. Read Phase 1 vs Future Phases
3. Read Key Workflows (especially BLE provisioning)

---

## 📋 Key Concepts

### Five Core Patterns
1. **Singleton Service Pattern** - Single global instances for all services
2. **Listener/Observer Pattern** - Services notify UI via subscriptions
3. **No Optimistic Updates** - Wait for MQTT response before UI update
4. **Firebase First** - All persistent data in Firestore
5. **Real-Time MQTT** - Device state via HiveMQ MQTT broker

### Critical Workflows
- ⭐ **BLE Provisioning** - Most important workflow (Section 4)
- 🔴 **Real-Time Control** - No optimistic updates rule (Section 5)
- 🟢 **Offline Detection** - Last-will topic pattern (Section 6)

### Data Layers
- **Firestore** - Cloud persistent data (users, homes, devices)
- **AsyncStorage** - Local cache for offline support
- **Keychain** - Encrypted secrets (tokens, passwords)
- **In-Memory** - MQTT metrics cache for real-time updates

---

## 🔗 File Structure

```
.kiro/steering/
├── INDEX.md               ← You are here
├── CONSOLIDATED.md        ← Single master document
├── tech.md               ← Legacy (preserved)
├── structure.md          ← Legacy (preserved)
├── product.md            ← Legacy (preserved)
└── agent-rules.md        ← Legacy (preserved)
```

---

## ⚡ Quick Reference

### Technology Stack at a Glance
- **Framework:** React Native 0.84.0 + TypeScript 5.8.3
- **Backend:** Firebase (Auth, Firestore, Storage, Crashlytics)
- **Real-Time:** HiveMQ MQTT Cloud
- **BLE:** react-native-ble-plx
- **UI:** React Navigation, NativeWind, Reanimated
- **Node:** >= 22.11.0

### Data Hierarchy
```
User
  └── Home
      └── Rooms
          └── Devices
              └── Channels (Relays)
```

### MQTT Topics
```
esp32/{deviceId}/status              # Device online/offline
esp32/{deviceId}/channels            # Relay states
esp32/{deviceId}/relay/{n}/set       # Control command
esp32/{deviceId}/relay/{n}/state     # Control response
```

### Firestore Collections
```
users/{userId}
homes/{homeId}
homes/{homeId}/rooms/{roomId}
homes/{homeId}/devices/{deviceId}
scenes/{sceneId}
```

### Screens (Phase 1)
```
Auth: LoginScreen, SignupScreen, PhoneOTPScreen
Home: HomeScreen, RoomManagementScreen
Provisioning: AddDeviceScreen, SimpleBleProvisionScreen, 
              WiFiProvisioningScreen, DeviceNamingScreen
Device: DeviceDetailsScreen, DeviceConfigScreen
Other: NotificationScreen, ProfileScreen, SettingsScreen
```

---

## 🎓 Learning Path

**Day 1: Understand the System**
- Read Architecture Overview
- Read Data Hierarchy
- Understand 5 core patterns

**Day 2: Learn Technology**
- Read Technology Stack
- Set up environment (.env)
- Read build commands

**Day 3: Study Workflows**
- Read Authentication flow (Section 1-2)
- Read BLE Provisioning flow (Section 4) ⭐
- Read Device Control flow (Section 5)

**Day 4: Explore Code**
- Navigate code organization
- Find key services (mqttService, bleService, deviceDataService)
- Find key screens (HomeScreen, DeviceDetailsScreen)

**Day 5: Start Development**
- Pick a small task
- Reference CONSOLIDATED.md as needed
- Follow code patterns established

---

## 🆘 Troubleshooting

### Issue: Don't know where to find something?
→ Use Ctrl+F to search CONSOLIDATED.md for keywords

### Issue: Need specific workflow details?
→ Go to "App Workflows" section and find numbered workflow

### Issue: Need to understand data model?
→ Go to "Data Model & Structure" section

### Issue: Need Firebase schema?
→ Go to "Firebase Firestore Collections" subsection

### Issue: Need MQTT format?
→ Go to "MQTT Communication Structure" subsection

### Issue: Don't know how to build/deploy?
→ Go to "Build Commands" in Technology Stack section

---

## 📞 Document Maintenance

**Last Updated:** June 2025

**All Content Consolidated Into:**
- CONSOLIDATED.md (primary master document)
- Legacy files preserved for reference:
  - tech.md (original tech stack)
  - structure.md (original structure)
  - product.md (original product overview)
  - agent-rules.md (agent guidelines)

**To Update Documentation:**
1. Edit CONSOLIDATED.md for any changes
2. Preserve section structure for easy navigation
3. Keep table of contents updated
4. Add version note in this INDEX.md

