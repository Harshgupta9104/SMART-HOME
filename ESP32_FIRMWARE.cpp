// ESP32 IoT Firmware v3.0.0
// Paste your firmware code here
/*
 * ESP32 IoT Firmware — Streamlined v3.0.0
 * BLE Provisioning + WiFi + MQTT + Relay Control
 * 
 * LED Status Indicators:
 * - Fast blink (150ms): BLE provisioning / WiFi connecting
 * - Slow blink (500ms): Initializing
 * - Solid ON: WiFi + MQTT connected (fully operational)
 * - OFF: Error state
 * 
 * Relay: Active LOW on GPIO23
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>
#include <WebServer.h>

// ====================== METADATA ======================
#define FW_VERSION      "3.0.0"
#define NVS_NAMESPACE   "wifi_v1"
#define NVS_CRASH_NS    "crash"

// ====================== LED STATUS INDICATORS =========
#define LED_PIN         2
#define LED_FAST_BLINK_MS  150
#define LED_SLOW_BLINK_MS  500

enum LedState {
  LED_INITIALIZING,    // Slow blink
  LED_BLE_PROV,        // Fast blink
  LED_WIFI_CONNECTING, // Fast blink
  LED_NORMAL,          // Solid ON when connected
  LED_ERROR,           // OFF
  LED_FACTORY_RESET    // Rapid blink
};

LedState      g_ledState       = LED_INITIALIZING;
unsigned long g_lastLedBlink   = 0;
bool          g_ledBlinkState  = false;

// ====================== BLE CONFIG ====================
#define BLE_DEVICE_PREFIX    "PROV_"
#define SERVICE_UUID         "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVID_SERVICE_UUID   "12345678-1234-1234-1234-1234567890ab"
#define DEVID_CHAR_UUID      "12345678-1234-1234-1234-1234567890cd"
#define BLE_NOTIFY_CHUNK_SZ  20

static String g_bleNotifyBuffer;

// ====================== MQTT CONFIG ===================
#ifndef MQTT_SERVER_OVERRIDE
  #define MQTT_SERVER_OVERRIDE "b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud"
#endif
#ifndef MQTT_USER_OVERRIDE
  #define MQTT_USER_OVERRIDE "bluetooth"
#endif
#ifndef MQTT_PASS_OVERRIDE
  #define MQTT_PASS_OVERRIDE "Ble_12345"
#endif

const char* MQTT_SERVER = MQTT_SERVER_OVERRIDE;
const int   MQTT_PORT   = 8883;
const char* MQTT_USER   = MQTT_USER_OVERRIDE;
const char* MQTT_PASS   = MQTT_PASS_OVERRIDE;

// Root CA (ISRG Root X1)
static const char MQTT_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// ====================== HARDWARE ======================
#define RELAY_PIN       23       // Relay control (GPIO23) - ACTIVE LOW
#define RESET_BUTTON    4        // Factory reset button

// ====================== TIMING =======================
#define WIFI_CONNECT_TIMEOUT_MS   25000UL
#define WIFI_RETRY_INTERVAL_MS    10000UL
#define WIFI_MAX_FAIL_COUNT       5

#define NTP_SYNC_TIMEOUT_MS       25000UL
#define NTP_RETRY_INTERVAL_MS     30000UL

#define MQTT_BASE_BACKOFF_MS      2000UL
#define MQTT_MAX_BACKOFF_MS       60000UL
#define MQTT_KEEPALIVE_SEC        60
#define MQTT_SOCKET_TIMEOUT_SEC   15
#define MQTT_FLUSH_BEFORE_RESTART_MS 300UL

#define MQTT_MSG_BUF_SIZE         1024

#define DATA_PUBLISH_INTERVAL_MS  5000UL

#define RESET_HOLD_TIME_MS        3000UL
#define RESET_ASYNC_DELAY_MS      300UL

#define BLE_DEINIT_DELAY_MS       50UL
#define BLE_PROV_TIMEOUT_MS       120000UL
#define BLE_MAX_RESTARTS          3

#define WDT_TIMEOUT_SEC           30

#define STATUS_DUMP_INTERVAL_MS   30000UL

#define HTTP_SERVER_PORT          80
#define HTTP_POLL_INTERVAL_MS     50UL
#define HTTP_RATE_LIMIT_MS        500UL

#define WIFI_SCAN_MAX_NETWORKS    20
#define WIFI_SCAN_TIMEOUT_MS      5000UL

// ====================== STATES =======================
enum DeviceState {
  STATE_BLE,
  STATE_WIFI_CONNECTING,
  STATE_WIFI_CONNECTED,
  STATE_MQTT_CONNECTED,
  STATE_CONFIG_UPDATING
};

enum WiFiState {
  WIFI_SM_IDLE,
  WIFI_SM_CONNECTING,
  WIFI_SM_CONNECTED,
  WIFI_SM_FAILED
};

enum WifiTestState {
  WTEST_IDLE,
  WTEST_CONNECTING,
  WTEST_PASSED,
  WTEST_FAILED
};

enum ScanState {
  SCAN_IDLE,
  SCAN_RUNNING,
  SCAN_DONE,
  SCAN_FAILED
};

// ====================== GLOBALS ======================
Preferences      g_prefs;
String           g_ssid     = "";
String           g_password = "";

bool g_bleActive        = false;
bool g_wifiConnected    = false;
bool g_timeSynced       = false;
bool g_mqttConnected    = false;
bool g_manualLedControl = false;

WiFiClientSecure g_espClient;
PubSubClient     g_mqttClient(g_espClient);
WebServer        g_httpServer(HTTP_SERVER_PORT);

String g_deviceId;
String g_mqttClientId;
String g_bleName;

String g_topicStatus;
String g_topicData;
String g_topicConfig;
String g_topicLedSet;
String g_topicLedState;
String g_topicRelaySet;
String g_topicRelayState;

BLEServer*         g_pServer         = nullptr;
BLECharacteristic* g_pCharacteristic = nullptr;
BLECharacteristic* g_pDevIdChar      = nullptr;

WiFiState     g_wifiState       = WIFI_SM_IDLE;
unsigned long g_wifiLastAttempt = 0;
uint8_t       g_wifiFailCount   = 0;

bool          g_ntpInProgress = false;
unsigned long g_ntpStart      = 0;
bool          g_ntpTriedOnce  = false;
unsigned long g_ntpLastFail   = 0;
unsigned long g_lastDotPrint  = 0;

unsigned long g_mqttReconnectPoll = 0;
unsigned long g_mqttBackoffMs     = MQTT_BASE_BACKOFF_MS;

bool g_subLedSet = false;
bool g_subConfig = false;
bool g_subRelaySet = false;

unsigned long g_lastSend       = 0;
unsigned long g_lastStatusDump = 0;
unsigned long g_lastHttpPoll   = 0;

unsigned long g_bleStartTime     = 0;
uint8_t       g_bleRestartCount  = 0;
bool          g_bleRestartLocked = false;

bool          g_resetPending     = false;
unsigned long g_resetPendingTime = 0;

bool          g_buttonPressed   = false;
unsigned long g_buttonPressTime = 0;

DeviceState g_deviceState = STATE_BLE;

// ====================== STRUCTURES ======================
struct DeferredWifiUpdate {
  bool   pending         = false;
  bool   bleProvisioning = false;
  String ssid            = "";
  String password        = "";
};
DeferredWifiUpdate g_deferredWifi;

struct AsyncWifiTest {
  WifiTestState state    = WTEST_IDLE;
  unsigned long startMs  = 0;
  String        ssid     = "";
  String        password = "";
  bool          forBle   = false;
  String        oldSsid  = "";
  String        oldPass  = "";
};
AsyncWifiTest g_wifiTest;

struct EndpointRL { unsigned long lastMs = 0; };
static EndpointRL g_rlStatus, g_rlData, g_rlLed, g_rlWifi,
                  g_rlNetworks, g_rlQr, g_rlRelay;

unsigned long g_minHeap = 0xFFFFFFFF;

bool g_httpStarted = false;

// async WiFi scan state
ScanState     g_scanState    = SCAN_IDLE;
unsigned long g_scanStartMs  = 0;
String        g_scanJson;

static char g_mqttMsgBuf[MQTT_MSG_BUF_SIZE];
static JsonDocument g_mqttDoc;

// ===== FORWARD DECLS =====
void  buildDeviceIdentity();
void  initBLE();
void  stopBLE();
void  bleNotifyChunked(const char* json);
void  connectWiFiNonBlocking();
void  applyWiFiHotspotFix();
void  handleWiFi();
void  syncTimeNonBlocking();
void  handleNTP();
void  mqttSetupClient();
bool  mqttReconnectOnce();
bool  mqttService();
void  mqttCallback(char* topic, byte* payload, unsigned int length);
void  publishData();
void  publishLedState(bool on);
void  publishRelayState(bool on);
void  factoryResetAsync();
void  handleResetButton();
void  handleAsyncWifiTest();
void  handleDeferredWifiUpdate();
void  setupHttpServer();
void  printStatusDump();
void  crashCounterCheck();
void  crashCounterReset();
void  publishConfigError(const char* reason);
bool  httpRateCheck(EndpointRL& ep);
bool  safeJsonAlloc(const String& body);
void  httpAddCORSHeaders();
void  httpHandleNotFound();
void  httpHandleGetStatus();
void  httpHandleGetData();
void  httpHandlePostLed();
void  httpHandlePostRelay();
void  httpHandlePostWifi();
void  httpHandleGetNetworks();
void  httpHandleGetQr();
void  handleWifiScanSM();
void  initAppWatchdog();
void  updateSystemLedState();
void  updateStatusLed();
String getStateString();

// ================= LED STATUS FUNCTIONS =================
String getStateString() {
  switch (g_deviceState) {
    case STATE_BLE:             return "BLE PROV";
    case STATE_WIFI_CONNECTING: return "WiFi...";
    case STATE_WIFI_CONNECTED:  return "WiFi OK";
    case STATE_MQTT_CONNECTED:  return "MQTT OK";
    case STATE_CONFIG_UPDATING: return "UPDATE";
    default: return "UNKNOWN";
  }
}

void updateSystemLedState() {
  if (g_resetPending) {
    g_ledState = LED_FACTORY_RESET;
  } else if (g_deviceState == STATE_BLE) {
    g_ledState = LED_BLE_PROV;
  } else if (g_deviceState == STATE_WIFI_CONNECTING || g_wifiState == WIFI_SM_CONNECTING) {
    g_ledState = LED_WIFI_CONNECTING;
  } else if (g_mqttConnected && g_wifiConnected) {
    g_ledState = LED_NORMAL;     // Solid ON when fully connected
  } else if (g_wifiConnected) {
    g_ledState = LED_WIFI_CONNECTING;
  } else if (g_wifiFailCount >= WIFI_MAX_FAIL_COUNT) {
    g_ledState = LED_ERROR;
  } else {
    g_ledState = LED_INITIALIZING;
  }
}

void updateStatusLed() {
  unsigned long now = millis();
  bool shouldBeOn = false;
  
  switch (g_ledState) {
    case LED_INITIALIZING:
      if (now - g_lastLedBlink >= LED_SLOW_BLINK_MS) {
        g_lastLedBlink = now;
        g_ledBlinkState = !g_ledBlinkState;
      }
      shouldBeOn = g_ledBlinkState;
      break;
      
    case LED_BLE_PROV:
    case LED_WIFI_CONNECTING:
      if (now - g_lastLedBlink >= LED_FAST_BLINK_MS) {
        g_lastLedBlink = now;
        g_ledBlinkState = !g_ledBlinkState;
      }
      shouldBeOn = g_ledBlinkState;
      break;
      
    case LED_NORMAL:
      shouldBeOn = true;   // LED stays ON continuously
      break;
      
    case LED_ERROR:
      shouldBeOn = false;
      break;
      
    case LED_FACTORY_RESET:
      if (now - g_lastLedBlink >= 100) {
        g_lastLedBlink = now;
        g_ledBlinkState = !g_ledBlinkState;
      }
      shouldBeOn = g_ledBlinkState;
      break;
  }
  
  digitalWrite(LED_PIN, shouldBeOn ? HIGH : LOW);
}

// ================= WATCHDOG ===================
void initAppWatchdog() {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_deinit();
  esp_task_wdt_config_t cfg = {
    .timeout_ms     = WDT_TIMEOUT_SEC * 1000,
    .idle_core_mask = (1 << 0),
    .trigger_panic  = true
  };
  esp_task_wdt_init(&cfg);
  esp_task_wdt_add(NULL);
#else
  esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
  esp_task_wdt_add(NULL);
#endif
}

// ================= LED STATE MQTT =====================
void publishLedState(bool on) {
  if (!g_mqttClient.connected()) return;
  g_mqttClient.publish(g_topicLedState.c_str(), on ? "ON" : "OFF", true);
  Serial.printf("[LED] State published -> %s\n", on ? "ON" : "OFF");
}

// ================= RELAY STATE MQTT ===================
void publishRelayState(bool on) {
  if (!g_mqttClient.connected()) return;
  g_mqttClient.publish(g_topicRelayState.c_str(), on ? "ON" : "OFF", true);
  Serial.printf("[RELAY] State published -> %s\n", on ? "ON" : "OFF");
}

// ================= BLE CALLBACKS ======================
class ProvServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    Serial.println("[BLE] App connected");
    g_bleRestartCount  = 0;
    g_bleRestartLocked = false;
  }
  void onDisconnect(BLEServer* pServer) override {
    Serial.println("[BLE] App disconnected");
    if (g_bleActive && BLEDevice::getInitialized()) {
      delay(5);
      BLEDevice::getAdvertising()->start();
    }
  }
};

class ProvCharCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    std::string raw = pChar->getValue();
    if (raw.empty()) return;

    while (!raw.empty() &&
           (raw.back() == '\0' || raw.back() == '\r' || raw.back() == '\n'))
      raw.pop_back();

    Serial.print("[BLE] RX: ");
    Serial.println(raw.c_str());

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, raw.c_str());
    if (err) {
      bleNotifyChunked("{\"status\":\"error\",\"msg\":\"json_parse\"}");
      return;
    }

    if (doc["ssid"].isNull() || doc["password"].isNull()) {
      bleNotifyChunked("{\"status\":\"error\",\"msg\":\"missing_keys\"}");
      return;
    }

    String newSsid = doc["ssid"].as<String>();
    String newPass = doc["password"].as<String>();
    newSsid.trim(); newPass.trim();

    if (newSsid.length() == 0) {
      bleNotifyChunked("{\"status\":\"error\",\"msg\":\"empty_ssid\"}");
      return;
    }
    if (newSsid.length() > 32) {
      bleNotifyChunked("{\"status\":\"error\",\"msg\":\"ssid_too_long\"}");
      return;
    }

    g_deferredWifi.pending         = true;
    g_deferredWifi.bleProvisioning = true;
    g_deferredWifi.ssid            = newSsid;
    g_deferredWifi.password        = newPass;

    bleNotifyChunked("{\"status\":\"testing_wifi\"}");
    Serial.println("[BLE] Credentials staged for async test: " + newSsid);
  }
};

// ================= BLE NOTIFY CHUNKED =================
void bleNotifyChunked(const char* json) {
  if (!g_bleActive || !g_pCharacteristic || !g_pServer) return;
  if (g_pServer->getConnectedCount() == 0) return;

  g_bleNotifyBuffer = String(json);
  size_t totalLen   = g_bleNotifyBuffer.length();
  size_t offset     = 0;

  while (offset < totalLen) {
    size_t chunkLen = min((size_t)BLE_NOTIFY_CHUNK_SZ, totalLen - offset);
    String chunk    = g_bleNotifyBuffer.substring(offset, offset + chunkLen);
    g_pCharacteristic->setValue(chunk.c_str());
    g_pCharacteristic->notify();
    delay(1);
    offset += chunkLen;
  }
  Serial.print("[BLE] TX: "); Serial.println(json);
}

// ================= BLE INIT / STOP ====================
void initBLE() {
  Serial.println("[BLE] Initializing...");
  BLEDevice::init(g_bleName.c_str());

  g_pServer = BLEDevice::createServer();
  g_pServer->setCallbacks(new ProvServerCallbacks());

  BLEService* provService = g_pServer->createService(SERVICE_UUID);
  g_pCharacteristic = provService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE    |
    BLECharacteristic::PROPERTY_WRITE_NR |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  g_pCharacteristic->addDescriptor(new BLE2902());
  g_pCharacteristic->setCallbacks(new ProvCharCallbacks());
  provService->start();

  BLEService* idService = g_pServer->createService(DEVID_SERVICE_UUID);
  g_pDevIdChar = idService->createCharacteristic(
    DEVID_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  g_pDevIdChar->setValue(g_deviceId.c_str());
  idService->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  adv->setMinPreferred(0x12);
  adv->start();

  g_bleActive    = true;
  g_bleStartTime = millis();
  Serial.println("[BLE] Advertising as: " + g_bleName);
}

void stopBLE() {
  if (!g_bleActive) return;
  Serial.println("[BLE] Stopping...");
  BLEDevice::deinit(true);
  g_pServer = nullptr; g_pCharacteristic = nullptr; g_pDevIdChar = nullptr;
  g_bleActive = false;
  Serial.printf("[BLE] Stopped — heap: %u bytes\n", ESP.getFreeHeap());
}

// ================= WiFi HELPERS =======================
void applyWiFiHotspotFix() {
  esp_wifi_set_protocol(WIFI_IF_STA,
    WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
  WiFi.setScanMethod(WIFI_ALL_CHANNEL_SCAN);
  WiFi.setSortMethod(WIFI_CONNECT_AP_BY_SIGNAL);
  WiFi.setAutoReconnect(false);
}

// ================= WiFi STATE MACHINE =================
void connectWiFiNonBlocking() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false, false);
  delay(100);
  applyWiFiHotspotFix();
  WiFi.setHostname(g_deviceId.c_str());
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  WiFi.begin(g_ssid.c_str(), g_password.c_str());
  g_wifiState       = WIFI_SM_CONNECTING;
  g_wifiLastAttempt = millis();
  g_deviceState     = STATE_WIFI_CONNECTING;
  Serial.println("[WiFi] Connecting to: " + g_ssid);
}

void handleWiFi() {
  switch (g_wifiState) {
    case WIFI_SM_IDLE: break;

    case WIFI_SM_CONNECTING: {
      wl_status_t st = WiFi.status();
      if (st == WL_CONNECTED) {
        g_wifiState     = WIFI_SM_CONNECTED;
        g_wifiConnected = true;
        g_wifiFailCount = g_bleRestartCount = 0;
        g_bleRestartLocked = false;
        Serial.printf("[WiFi] Connected — IP: %s  RSSI: %d\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
        if (g_bleActive) {
          bleNotifyChunked("{\"status\":\"wifi_saved\"}");
          stopBLE();
        }
        g_deviceState = STATE_WIFI_CONNECTED;
        setupHttpServer();
        syncTimeNonBlocking();
      } else if (st == WL_CONNECT_FAILED) {
        g_wifiState = WIFI_SM_FAILED; g_wifiConnected = false; g_wifiFailCount++;
        WiFi.disconnect(false, false);
        bleNotifyChunked("{\"status\":\"error\",\"msg\":\"wifi_auth_failed\"}");
      } else if (st == WL_NO_SSID_AVAIL) {
        g_wifiState = WIFI_SM_FAILED; g_wifiConnected = false; g_wifiFailCount++;
        WiFi.disconnect(false, false);
        bleNotifyChunked("{\"status\":\"error\",\"msg\":\"wifi_ap_not_found\"}");
      } else if (millis() - g_wifiLastAttempt > WIFI_CONNECT_TIMEOUT_MS) {
        g_wifiState = WIFI_SM_FAILED; g_wifiConnected = false; g_wifiFailCount++;
        WiFi.disconnect(false, false);
        bleNotifyChunked("{\"status\":\"error\",\"msg\":\"wifi_timeout\"}");
      }
      break;
    }

    case WIFI_SM_CONNECTED:
      if (WiFi.status() != WL_CONNECTED) {
        g_wifiConnected = false; g_timeSynced = false; g_mqttConnected = false;
        if (g_mqttClient.connected()) g_mqttClient.disconnect();
        g_subLedSet = false;
        g_subConfig = false;
        g_subRelaySet = false;
        g_httpServer.stop();
        g_httpStarted = false;
        connectWiFiNonBlocking();
      }
      break;

    case WIFI_SM_FAILED: {
      if (g_bleActive) break;
      unsigned long factor = min((unsigned long)g_wifiFailCount, 6UL);
      unsigned long retry  = min(WIFI_RETRY_INTERVAL_MS * factor, 60000UL);
      if (millis() - g_wifiLastAttempt < retry) break;

      if (g_wifiFailCount >= WIFI_MAX_FAIL_COUNT) {
        g_prefs.begin(NVS_NAMESPACE, false); g_prefs.clear(); g_prefs.end();
        g_ssid = ""; g_password = ""; g_wifiFailCount = 0;
        g_wifiState = WIFI_SM_IDLE;
        WiFi.disconnect(false, false); WiFi.mode(WIFI_OFF); delay(200);
        initBLE(); g_deviceState = STATE_BLE;
        return;
      }
      if (g_wifiFailCount >= 2) {
        WiFi.disconnect(false, false); WiFi.mode(WIFI_OFF); delay(200);
        initBLE(); break;
      }
      g_wifiLastAttempt = millis();
      WiFi.disconnect(false, false); delay(100);
      WiFi.mode(WIFI_STA); applyWiFiHotspotFix();
      WiFi.begin(g_ssid.c_str(), g_password.c_str());
      g_wifiState = WIFI_SM_CONNECTING;
      break;
    }
  }
}

// ================= NTP ===============================
void syncTimeNonBlocking() {
  if (g_timeSynced || g_ntpInProgress || WiFi.status() != WL_CONNECTED) return;
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  g_ntpInProgress = true; g_ntpStart = millis(); g_ntpTriedOnce = true;
  Serial.println("[NTP] Sync started...");
}

void handleNTP() {
  if (!g_ntpInProgress && !g_timeSynced && g_ntpTriedOnce && g_wifiConnected) {
    if (millis() - g_ntpLastFail > NTP_RETRY_INTERVAL_MS) {
      configTime(0, 0, "pool.ntp.org", "time.google.com");
      g_ntpInProgress = true; g_ntpStart = millis();
    }
  }
  if (!g_ntpInProgress || g_timeSynced) return;

  time_t now = time(nullptr);
  if (now > 1700000000UL) {
    char buf[32]; strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M UTC", gmtime(&now));
    Serial.printf("\n[NTP] Synced: %s\n", buf);
    g_timeSynced = true; g_ntpInProgress = false;
    crashCounterReset();
  } else if (millis() - g_ntpStart > NTP_SYNC_TIMEOUT_MS) {
    Serial.println("\n[NTP] Timeout — retry later");
    g_ntpInProgress = false; g_ntpLastFail = millis();
  } else if (millis() - g_lastDotPrint > 500) {
    Serial.print("."); g_lastDotPrint = millis();
  }
}

// ================= MQTT SETUP ========================
void mqttSetupClient() {
  g_espClient.setCACert(MQTT_ROOT_CA);
  g_espClient.setTimeout(MQTT_SOCKET_TIMEOUT_SEC);
  g_mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  g_mqttClient.setCallback(mqttCallback);
  g_mqttClient.setBufferSize(MQTT_MSG_BUF_SIZE);
  g_mqttClient.setKeepAlive(MQTT_KEEPALIVE_SEC);
  g_mqttClient.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SEC);
}

void publishConfigError(const char* reason) {
  JsonDocument doc;
  doc["status"] = "error"; doc["reason"] = reason;
  char buf[128]; serializeJson(doc, buf, sizeof(buf));
  if (g_mqttClient.connected())
    g_mqttClient.publish(g_topicStatus.c_str(), buf, true);
}

// ================= MQTT CALLBACK =====================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (length >= MQTT_MSG_BUF_SIZE) length = MQTT_MSG_BUF_SIZE - 1;
  memcpy(g_mqttMsgBuf, payload, length);
  g_mqttMsgBuf[length] = '\0';

  Serial.printf("[MQTT] << %s: %s\n", topic, g_mqttMsgBuf);

  // Handle LED control
  if (strcmp(topic, g_topicLedSet.c_str()) == 0) {
    String cmd = String(g_mqttMsgBuf);
    cmd.trim(); cmd.toUpperCase();
    if (cmd == "ON") {
      g_manualLedControl = true;
      digitalWrite(LED_PIN, HIGH);
      publishLedState(true);
      Serial.println("[LED] ON (MQTT)");
    } else if (cmd == "OFF") {
      g_manualLedControl = true;
      digitalWrite(LED_PIN, LOW);
      publishLedState(false);
      Serial.println("[LED] OFF (MQTT)");
    }
    return;
  }

  // Handle Relay control (ACTIVE LOW logic)
  if (strcmp(topic, g_topicRelaySet.c_str()) == 0) {
    String cmd = String(g_mqttMsgBuf);
    cmd.trim(); cmd.toUpperCase();
    if (cmd == "ON") {
      digitalWrite(RELAY_PIN, LOW);   // ACTIVE LOW: LOW = ON
      publishRelayState(true);
      Serial.println("[RELAY] ON (MQTT)");
    } else if (cmd == "OFF") {
      digitalWrite(RELAY_PIN, HIGH);  // ACTIVE LOW: HIGH = OFF
      publishRelayState(false);
      Serial.println("[RELAY] OFF (MQTT)");
    }
    return;
  }

  // Handle config updates
  if (strcmp(topic, g_topicConfig.c_str()) != 0) return;

  g_mqttDoc.clear();
  DeserializationError err = deserializeJson(g_mqttDoc, g_mqttMsgBuf);
  if (err) { publishConfigError("parse_error"); return; }

  if (g_mqttDoc["type"].isNull()) { publishConfigError("missing_type"); return; }

  const char* type = g_mqttDoc["type"].as<const char*>();

  if (strcmp(type, "wifi_update") == 0) {
    if (g_mqttDoc["ssid"].isNull() || g_mqttDoc["password"].isNull()) {
      publishConfigError("missing_ssid_or_password"); return;
    }
    String s = g_mqttDoc["ssid"].as<String>(); s.trim();
    String p = g_mqttDoc["password"].as<String>(); p.trim();
    if (s.length() == 0 || s.length() > 32) { publishConfigError("invalid_ssid"); return; }

    g_deferredWifi.pending         = true;
    g_deferredWifi.bleProvisioning = false;
    g_deferredWifi.ssid            = s;
    g_deferredWifi.password        = p;
    g_deviceState = STATE_CONFIG_UPDATING;
    g_mqttClient.publish(g_topicStatus.c_str(), "wifi_update_queued", true);
    return;
  }

  if (strcmp(type, "factory_reset") == 0) {
    g_mqttClient.publish(g_topicStatus.c_str(), "factory_reset_triggered", true);
    g_resetPending = true; g_resetPendingTime = millis();
    return;
  }

  publishConfigError("unknown_type");
}

// ============== ASYNC WiFi TEST ======================
static void startAsyncWifiTest(const String& ssid, const String& pass,
                               bool forBle,
                               const String& oldSsid = "",
                               const String& oldPass = "") {
  Serial.printf("[WTEST] Async start — SSID: %s\n", ssid.c_str());
  WiFi.disconnect(false, false);
  delay(50);
  applyWiFiHotspotFix();
  WiFi.begin(ssid.c_str(), pass.c_str());

  g_wifiTest.state    = WTEST_CONNECTING;
  g_wifiTest.startMs  = millis();
  g_wifiTest.ssid     = ssid;
  g_wifiTest.password = pass;
  g_wifiTest.forBle   = forBle;
  g_wifiTest.oldSsid  = oldSsid;
  g_wifiTest.oldPass  = oldPass;
}

void handleAsyncWifiTest() {
  if (g_wifiTest.state == WTEST_IDLE) return;
  esp_task_wdt_reset();

  switch (g_wifiTest.state) {
    case WTEST_CONNECTING: {
      wl_status_t st = WiFi.status();
      if (st == WL_CONNECTED) {
        Serial.printf("[WTEST] PASSED — IP: %s\n",
                      WiFi.localIP().toString().c_str());
        g_wifiTest.state = WTEST_PASSED;
      } else if (st == WL_CONNECT_FAILED) {
        Serial.println("[WTEST] FAILED — auth rejected");
        g_wifiTest.state = WTEST_FAILED;
      } else if (millis() - g_wifiTest.startMs > WIFI_CONNECT_TIMEOUT_MS) {
        Serial.println("[WTEST] FAILED — timeout");
        g_wifiTest.state = WTEST_FAILED;
      }
      return;
    }

    case WTEST_PASSED: {
      g_prefs.begin(NVS_NAMESPACE, false);
      g_prefs.putString("ssid",     g_wifiTest.ssid);
      g_prefs.putString("password", g_wifiTest.password);
      g_prefs.end();
      g_ssid = g_wifiTest.ssid; g_password = g_wifiTest.password;

      if (g_wifiTest.forBle) {
        bleNotifyChunked("{\"status\":\"ok\",\"msg\":\"wifi_saved\"}");
        bleNotifyChunked("{\"status\":\"info\",\"msg\":\"connecting_wifi\"}");
      } else {
        g_mqttClient.publish(g_topicStatus.c_str(), "wifi_update_success", true);
        g_mqttClient.loop();
        delay(MQTT_FLUSH_BEFORE_RESTART_MS);
        ESP.restart();
      }

      g_wifiFailCount   = 0;
      g_wifiTest.state  = WTEST_IDLE;
      g_wifiState       = WIFI_SM_CONNECTED;
      g_wifiConnected   = true;
      g_deviceState     = STATE_WIFI_CONNECTED;

      setupHttpServer();
      syncTimeNonBlocking();
      if (g_bleActive) stopBLE();
      break;
    }

    case WTEST_FAILED: {
      WiFi.disconnect(false, false); WiFi.mode(WIFI_OFF); delay(50);
      if (g_wifiTest.forBle) {
        bleNotifyChunked("{\"status\":\"error\",\"msg\":\"wifi_failed\"}");
      } else {
        publishConfigError("wifi_test_failed");
        g_ssid = g_wifiTest.oldSsid; g_password = g_wifiTest.oldPass;
        connectWiFiNonBlocking();
      }
      g_wifiTest.state = WTEST_IDLE;
      break;
    }

    default: break;
  }
}

// ============== DEFERRED WiFi UPDATE =================
void handleDeferredWifiUpdate() {
  if (!g_deferredWifi.pending) return;
  if (g_wifiTest.state != WTEST_IDLE) return;
  g_deferredWifi.pending = false;

  if (g_deferredWifi.bleProvisioning) {
    startAsyncWifiTest(g_deferredWifi.ssid, g_deferredWifi.password, true);
  } else {
    g_mqttClient.publish(g_topicStatus.c_str(), "wifi_updating", true);
    g_mqttClient.loop();
    startAsyncWifiTest(g_deferredWifi.ssid, g_deferredWifi.password,
                       false, g_ssid, g_password);
  }
}

// ================= MQTT RECONNECT + SERVICE ==========
bool mqttReconnectOnce() {
  if (WiFi.status() != WL_CONNECTED) return false;

  char lwtBuf[96];
  snprintf(lwtBuf, sizeof(lwtBuf),
           "{\"status\":\"offline\",\"device\":\"%s\",\"fw\":\"%s\"}",
           g_deviceId.c_str(), FW_VERSION);

  Serial.printf("[MQTT] Connecting as %s...\n", g_mqttClientId.c_str());
  bool ok = g_mqttClient.connect(
    g_mqttClientId.c_str(), MQTT_USER, MQTT_PASS,
    g_topicStatus.c_str(), 1, true, lwtBuf
  );

  if (ok) {
    g_subLedSet = g_mqttClient.subscribe(g_topicLedSet.c_str(), 1);
    g_subConfig = g_mqttClient.subscribe(g_topicConfig.c_str(), 1);
    g_subRelaySet = g_mqttClient.subscribe(g_topicRelaySet.c_str(), 1);

    char onlineBuf[160];
    snprintf(onlineBuf, sizeof(onlineBuf),
             "{\"status\":\"online\",\"device\":\"%s\",\"fw\":\"%s\","
             "\"ip\":\"%s\",\"ntp\":\"%s\"}",
             g_deviceId.c_str(), FW_VERSION,
             WiFi.localIP().toString().c_str(),
             g_timeSynced ? "ok" : "pending");
    g_mqttClient.publish(g_topicStatus.c_str(), onlineBuf, true);

    // Publish initial relay state
    publishRelayState(digitalRead(RELAY_PIN) == LOW);

    g_mqttConnected = true;
    g_mqttBackoffMs = MQTT_BASE_BACKOFF_MS;
    g_deviceState   = STATE_MQTT_CONNECTED;
    Serial.println("[MQTT] Connected + subscribed (LED, Config, Relay)");
    return true;

  } else {
    g_mqttBackoffMs = min(g_mqttBackoffMs * 2, MQTT_MAX_BACKOFF_MS);
    g_mqttConnected = false;
    g_subLedSet = false;
    g_subConfig = false;
    g_subRelaySet = false;
    Serial.printf("[MQTT] Failed state=%d, retry in %lus\n",
                  g_mqttClient.state(), g_mqttBackoffMs / 1000);
    return false;
  }
}

bool mqttService() {
  g_mqttClient.loop();

  bool wasConnected = g_mqttConnected;
  g_mqttConnected   = g_mqttClient.connected();

  if (wasConnected && !g_mqttConnected) {
    Serial.println("[MQTT] Disconnected — clearing sub flags");
    g_subLedSet = false;
    g_subConfig = false;
    g_subRelaySet = false;
  }

  if (g_mqttConnected && !wasConnected)
    g_deviceState = STATE_MQTT_CONNECTED;

  if (!g_wifiConnected) {
    if (wasConnected) Serial.println("[MQTT] WiFi lost — MQTT down");
    g_mqttConnected = false;
    g_subLedSet = false;
    g_subConfig = false;
    g_subRelaySet = false;
    return false;
  }

  if (g_mqttConnected) {
    if (!g_subLedSet) {
      g_subLedSet = g_mqttClient.subscribe(g_topicLedSet.c_str(), 1);
    }
    if (!g_subConfig) {
      g_subConfig = g_mqttClient.subscribe(g_topicConfig.c_str(), 1);
    }
    if (!g_subRelaySet) {
      g_subRelaySet = g_mqttClient.subscribe(g_topicRelaySet.c_str(), 1);
    }
    return false;
  }

  if (millis() - g_mqttReconnectPoll > g_mqttBackoffMs) {
    g_mqttReconnectPoll = millis();
    return mqttReconnectOnce();
  }
  return false;
}

// ================= TELEMETRY =========================
void publishData() {
  if (!g_mqttConnected) return;
  esp_task_wdt_reset();

  JsonDocument doc;
  doc["device"]   = g_deviceId;
  doc["fw"]       = FW_VERSION;
  doc["uptime"]   = millis() / 1000;
  doc["rssi"]     = WiFi.RSSI();
  doc["heap"]     = ESP.getFreeHeap();
  doc["min_heap"] = g_minHeap;
  doc["ntp"]      = g_timeSynced ? "ok" : "pending";
  doc["led"]      = (digitalRead(LED_PIN) == HIGH);
  doc["relay"]    = (digitalRead(RELAY_PIN) == LOW);  // LOW = ON

  char payload[350];
  serializeJson(doc, payload, sizeof(payload));

  if (!g_mqttClient.publish(g_topicData.c_str(), payload, true)) {
    Serial.println("[MQTT] Publish FAILED, forcing disconnect");
    g_mqttClient.disconnect();
    g_mqttConnected = false;
    g_subLedSet = false;
    g_subConfig = false;
    g_subRelaySet = false;
  } else {
    Serial.printf("[MQTT] >> %s\n", payload);
  }
}

// ================= FACTORY RESET =====================
void factoryResetAsync() {
  Serial.println("\n[SYS] *** FACTORY RESET ***");
  digitalWrite(LED_PIN, HIGH);

  if (g_mqttClient.connected()) {
    g_mqttClient.publish(g_topicStatus.c_str(), "offline", true);
    g_mqttClient.loop();
    g_mqttClient.disconnect();
  }

  g_prefs.begin(NVS_NAMESPACE, false); g_prefs.clear(); g_prefs.end();
  g_prefs.begin(NVS_CRASH_NS,  false); g_prefs.clear(); g_prefs.end();
  
  WiFi.disconnect(true, true);

  Serial.println("[SYS] Restarting...");
  delay(200);
  ESP.restart();
}

void handleResetButton() {
  bool pressed = (digitalRead(RESET_BUTTON) == LOW);

  if (pressed && !g_buttonPressed) {
    g_buttonPressed = true; g_buttonPressTime = millis();
    Serial.println("[BTN] Hold 3s for factory reset...");
  } else if (!pressed && g_buttonPressed) {
    g_buttonPressed = false;
    if (!g_manualLedControl) digitalWrite(LED_PIN, LOW);
  }

  if (g_buttonPressed) {
    if (millis() - g_buttonPressTime > RESET_HOLD_TIME_MS) {
      g_resetPending = true; g_resetPendingTime = millis();
      g_buttonPressed = false;
    } else if (!g_manualLedControl) {
      digitalWrite(LED_PIN, (millis() / 150) % 2);
    }
  }

  if (g_resetPending && millis() - g_resetPendingTime > RESET_ASYNC_DELAY_MS) {
    g_resetPending = false;
    factoryResetAsync();
  }
}

// ================= CRASH COUNTER =====================
void crashCounterCheck() {
  g_prefs.begin(NVS_CRASH_NS, false);
  uint8_t c = g_prefs.getUChar("count", 0) + 1;
  g_prefs.putUChar("count", c);
  g_prefs.end();
  Serial.printf("[SYS] Boot count (crash guard): %d\n", c);
  if (c >= 3) {
    Serial.println("[SYS] Crash loop — clearing credentials");
    g_prefs.begin(NVS_NAMESPACE, false); g_prefs.clear(); g_prefs.end();
    g_prefs.begin(NVS_CRASH_NS,  false); g_prefs.putUChar("count", 0); g_prefs.end();
    g_ssid = ""; g_password = "";
  }
}

void crashCounterReset() {
  g_prefs.begin(NVS_CRASH_NS, false); g_prefs.putUChar("count", 0); g_prefs.end();
  Serial.println("[SYS] Crash counter reset");
}

// ================= DEVICE IDENTITY ===================
void buildDeviceIdentity() {
  uint64_t chipid = ESP.getEfuseMac();
  char idBuf[9];
  snprintf(idBuf, sizeof(idBuf), "%08X", (uint32_t)(chipid & 0xFFFFFFFF));

  g_deviceId = "ESP32_" + String(idBuf);
  g_bleName  = String(BLE_DEVICE_PREFIX) + String(idBuf);

  g_topicStatus   = "esp32/" + String(idBuf) + "/status";
  g_topicData     = "esp32/" + String(idBuf) + "/data";
  g_topicConfig   = "esp32/" + String(idBuf) + "/config";
  g_topicLedSet   = "esp32/" + String(idBuf) + "/led/set";
  g_topicLedState = "esp32/" + String(idBuf) + "/led/state";
  g_topicRelaySet   = "esp32/" + String(idBuf) + "/relay/set";
  g_topicRelayState = "esp32/" + String(idBuf) + "/relay/state";

  uint8_t mac[6]; esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char macBuf[13];
  snprintf(macBuf, sizeof(macBuf), "%02X%02X%02X%02X%02X%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  g_mqttClientId = "ESP32_" + String(macBuf);

  Serial.println("[SYS] Device ID:     " + g_deviceId);
  Serial.println("[SYS] MQTT ClientID: " + g_mqttClientId);
  Serial.println("[SYS] BLE Name:      " + g_bleName);
}

// ================= HTTP HELPERS ======================
bool httpRateCheck(EndpointRL& ep) {
  if (millis() - ep.lastMs < HTTP_RATE_LIMIT_MS) {
    g_httpServer.send(429, "application/json",
                      "{\"status\":\"error\",\"msg\":\"rate_limited\"}");
    return false;
  }
  ep.lastMs = millis();
  return true;
}

void httpAddCORSHeaders() {
  g_httpServer.sendHeader("Access-Control-Allow-Origin",  "*");
  g_httpServer.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  g_httpServer.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

bool safeJsonAlloc(const String& body) {
  if (body.length() > 1024 || ESP.getFreeHeap() < 4096) {
    Serial.printf("[HTTP] JSON rejected: size=%u heap=%u\n",
                  body.length(), ESP.getFreeHeap());
    return false;
  }
  return true;
}

// ================= HTTP HANDLERS =====================
void httpHandleNotFound() {
  httpAddCORSHeaders();
  g_httpServer.send(404, "application/json", "{\"status\":\"not_found\"}");
}

void httpHandleGetStatus() {
  if (!httpRateCheck(g_rlStatus)) return;
  httpAddCORSHeaders();
  const char* st = "UNKNOWN";
  switch (g_deviceState) {
    case STATE_BLE:             st = "BLE_PROVISIONING"; break;
    case STATE_WIFI_CONNECTING: st = "WIFI_CONNECTING";  break;
    case STATE_WIFI_CONNECTED:  st = "WIFI_CONNECTED";   break;
    case STATE_MQTT_CONNECTED:  st = "MQTT_CONNECTED";   break;
    case STATE_CONFIG_UPDATING: st = "CONFIG_UPDATING";  break;
  }
  JsonDocument doc;
  doc["device"]   = g_deviceId; doc["fw"]       = FW_VERSION;
  doc["state"]    = st;         doc["uptime"]   = millis() / 1000;
  doc["heap"]     = ESP.getFreeHeap(); doc["min_heap"] = g_minHeap;
  doc["ip"]       = WiFi.localIP().toString(); doc["rssi"] = WiFi.RSSI();
  doc["ssid"]     = g_ssid;     doc["wifi"]     = g_wifiConnected;
  doc["ntp"]      = g_timeSynced ? "ok" : "pending";
  doc["mqtt"]     = g_mqttClient.connected();
  doc["ble"]      = g_bleActive; doc["led"]     = (digitalRead(LED_PIN) == HIGH);
  doc["relay"]    = (digitalRead(RELAY_PIN) == LOW);
  char buf[550]; serializeJson(doc, buf, sizeof(buf));
  g_httpServer.send(200, "application/json", buf);
}

void httpHandleGetData() {
  if (!httpRateCheck(g_rlData)) return;
  httpAddCORSHeaders();
  JsonDocument doc;
  doc["device"]   = g_deviceId; doc["fw"]       = FW_VERSION;
  doc["uptime"]   = millis() / 1000; doc["rssi"] = WiFi.RSSI();
  doc["heap"]     = ESP.getFreeHeap(); doc["min_heap"] = g_minHeap;
  doc["ntp"]      = g_timeSynced ? "ok" : "pending";
  doc["ip"]       = WiFi.localIP().toString();
  doc["mqtt"]     = g_mqttClient.connected(); doc["wifi"] = g_wifiConnected;
  doc["led"]      = (digitalRead(LED_PIN) == HIGH);
  doc["relay"]    = (digitalRead(RELAY_PIN) == LOW);
  char buf[350]; serializeJson(doc, buf, sizeof(buf));
  g_httpServer.send(200, "application/json", buf);
}

void httpHandlePostLed() {
  if (!httpRateCheck(g_rlLed)) return;
  httpAddCORSHeaders();
  if (g_httpServer.method() == HTTP_OPTIONS) { g_httpServer.send(204); return; }
  if (!g_httpServer.hasArg("plain")) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"no_body\"}");
    return;
  }
  String body = g_httpServer.arg("plain");
  if (!safeJsonAlloc(body)) {
    g_httpServer.send(413, "application/json",
                      "{\"status\":\"error\",\"msg\":\"json_too_large\"}");
    return;
  }
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    if (err == DeserializationError::NoMemory || err == DeserializationError::TooDeep) {
      g_httpServer.send(413, "application/json",
                        "{\"status\":\"error\",\"msg\":\"json_too_large\"}");
    } else {
      g_httpServer.send(400, "application/json",
                        "{\"status\":\"error\",\"msg\":\"json_parse\"}");
    }
    return;
  }
  if (doc["state"].isNull()) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"missing_state\"}");
    return;
  }
  String state = doc["state"].as<String>(); state.trim(); state.toUpperCase();
  if (state == "ON") {
    g_manualLedControl = true; digitalWrite(LED_PIN, HIGH);
    publishLedState(true);
    g_httpServer.send(200, "application/json", "{\"status\":\"ok\",\"led\":true}");
  } else if (state == "OFF") {
    g_manualLedControl = true; digitalWrite(LED_PIN, LOW);
    publishLedState(false);
    g_httpServer.send(200, "application/json", "{\"status\":\"ok\",\"led\":false}");
  } else {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"invalid_state\"}");
  }
}

// ================= RELAY HTTP HANDLER =================
void httpHandlePostRelay() {
  if (!httpRateCheck(g_rlRelay)) return;
  httpAddCORSHeaders();
  if (g_httpServer.method() == HTTP_OPTIONS) { g_httpServer.send(204); return; }
  if (!g_httpServer.hasArg("plain")) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"no_body\"}");
    return;
  }
  String body = g_httpServer.arg("plain");
  if (!safeJsonAlloc(body)) {
    g_httpServer.send(413, "application/json",
                      "{\"status\":\"error\",\"msg\":\"json_too_large\"}");
    return;
  }
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    if (err == DeserializationError::NoMemory || err == DeserializationError::TooDeep) {
      g_httpServer.send(413, "application/json",
                        "{\"status\":\"error\",\"msg\":\"json_too_large\"}");
    } else {
      g_httpServer.send(400, "application/json",
                        "{\"status\":\"error\",\"msg\":\"json_parse\"}");
    }
    return;
  }
  if (doc["state"].isNull()) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"missing_state\"}");
    return;
  }
  String state = doc["state"].as<String>(); state.trim(); state.toUpperCase();
  if (state == "ON") {
    digitalWrite(RELAY_PIN, LOW);   // ACTIVE LOW: LOW = ON
    publishRelayState(true);
    g_httpServer.send(200, "application/json", "{\"status\":\"ok\",\"relay\":true}");
    Serial.println("[RELAY] ON (HTTP)");
  } else if (state == "OFF") {
    digitalWrite(RELAY_PIN, HIGH);  // ACTIVE LOW: HIGH = OFF
    publishRelayState(false);
    g_httpServer.send(200, "application/json", "{\"status\":\"ok\",\"relay\":false}");
    Serial.println("[RELAY] OFF (HTTP)");
  } else {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"invalid_state\"}");
  }
}

void httpHandlePostWifi() {
  if (!httpRateCheck(g_rlWifi)) return;
  httpAddCORSHeaders();
  if (g_httpServer.method() == HTTP_OPTIONS) { g_httpServer.send(204); return; }
  if (!g_httpServer.hasArg("plain")) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"no_body\"}");
    return;
  }
  String body = g_httpServer.arg("plain");
  if (!safeJsonAlloc(body)) {
    g_httpServer.send(413, "application/json",
                      "{\"status\":\"error\",\"msg\":\"json_too_large\"}");
    return;
  }
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    if (err == DeserializationError::NoMemory || err == DeserializationError::TooDeep) {
      g_httpServer.send(413, "application/json",
                        "{\"status\":\"error\",\"msg\":\"json_too_large\"}");
    } else {
      g_httpServer.send(400, "application/json",
                        "{\"status\":\"error\",\"msg\":\"json_parse\"}");
    }
    return;
  }
  if (doc["ssid"].isNull() || doc["password"].isNull()) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"missing_keys\"}");
    return;
  }
  String s = doc["ssid"].as<String>(); s.trim();
  String p = doc["password"].as<String>(); p.trim();
  if (s.length() == 0 || s.length() > 32) {
    g_httpServer.send(400, "application/json","{\"status\":\"error\",\"msg\":\"invalid_ssid\"}");
    return;
  }
  g_deferredWifi.pending         = true;
  g_deferredWifi.bleProvisioning = false;
  g_deferredWifi.ssid            = s;
  g_deferredWifi.password        = p;
  g_deviceState = STATE_CONFIG_UPDATING;
  g_httpServer.send(200, "application/json",
                    "{\"status\":\"ok\",\"msg\":\"wifi_update_queued\"}");
}

// ======== ASYNC WiFi SCAN STATE MACHINE ==============
void handleWifiScanSM() {
  switch (g_scanState) {
    case SCAN_IDLE: break;

    case SCAN_RUNNING: {
      int n = WiFi.scanComplete();
      if (n == WIFI_SCAN_RUNNING) {
        if (millis() - g_scanStartMs > WIFI_SCAN_TIMEOUT_MS) {
          WiFi.scanDelete();
          g_scanState = SCAN_FAILED;
          Serial.println("[SCAN] Timeout");
        }
        return;
      }
      if (n < 0) {
        g_scanState = SCAN_FAILED;
        Serial.printf("[SCAN] Failed: %d\n", n);
        return;
      }

      JsonDocument doc;
      JsonArray arr = doc["networks"].to<JsonArray>();
      for (int i = 0; i < n && i < WIFI_SCAN_MAX_NETWORKS; i++) {
        JsonObject net = arr.add<JsonObject>();
        net["ssid"] = WiFi.SSID(i);
        net["rssi"] = WiFi.RSSI(i);
        net["enc"]  = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "open" : "secured";
      }
      WiFi.scanDelete();
      g_scanJson = "";
      serializeJson(doc, g_scanJson);
      g_scanState = SCAN_DONE;
      Serial.printf("[SCAN] Done: %d networks\n", n);
      break;
    }

    case SCAN_DONE:
    case SCAN_FAILED:
      break;
  }
}

void httpHandleGetNetworks() {
  if (!httpRateCheck(g_rlNetworks)) return;
  httpAddCORSHeaders();

  if (g_scanState == SCAN_IDLE) {
    WiFi.scanDelete();
    WiFi.scanNetworks(true, true, false, 150);
    g_scanStartMs = millis();
    g_scanState   = SCAN_RUNNING;
    g_httpServer.send(202, "application/json",
                      "{\"status\":\"scan_started\"}");
    return;
  }

  if (g_scanState == SCAN_RUNNING) {
    g_httpServer.send(202, "application/json",
                      "{\"status\":\"pending\"}");
    return;
  }

  if (g_scanState == SCAN_FAILED) {
    g_httpServer.send(500, "application/json",
                      "{\"status\":\"error\",\"msg\":\"scan_failed\"}");
    return;
  }

  g_scanState = SCAN_IDLE;
  g_httpServer.send(200, "application/json", g_scanJson);
}

// ================= /api/qr ===========================
void httpHandleGetQr() {
  if (!httpRateCheck(g_rlQr)) return;
  httpAddCORSHeaders();
  JsonDocument doc;
  doc["device"]  = g_deviceId;
  doc["mqtt_id"] = g_mqttClientId;
  doc["ble"]     = g_bleName;
  doc["fw"]      = FW_VERSION;
  char buf[280]; serializeJson(doc, buf, sizeof(buf));
  g_httpServer.send(200, "application/json", buf);
}

// ================= HTTP SERVER SETUP =================
void setupHttpServer() {
  if (g_httpStarted) return;
  g_httpServer.stop();
  g_httpServer.on("/api/status",          HTTP_GET,     httpHandleGetStatus);
  g_httpServer.on("/api/data",            HTTP_GET,     httpHandleGetData);
  g_httpServer.on("/api/led",             HTTP_POST,    httpHandlePostLed);
  g_httpServer.on("/api/led",             HTTP_OPTIONS, [](){
    httpAddCORSHeaders(); g_httpServer.send(204); });
  g_httpServer.on("/api/relay",           HTTP_POST,    httpHandlePostRelay);
  g_httpServer.on("/api/relay",           HTTP_OPTIONS, [](){
    httpAddCORSHeaders(); g_httpServer.send(204); });
  g_httpServer.on("/api/wifi",            HTTP_POST,    httpHandlePostWifi);
  g_httpServer.on("/api/wifi",            HTTP_OPTIONS, [](){
    httpAddCORSHeaders(); g_httpServer.send(204); });
  g_httpServer.on("/api/networks",        HTTP_GET,     httpHandleGetNetworks);
  g_httpServer.on("/api/qr",              HTTP_GET,     httpHandleGetQr);
  g_httpServer.onNotFound(httpHandleNotFound);
  g_httpServer.begin();
  g_httpStarted = true;
  Serial.printf("[HTTP] Server started: http://%s:%d\n",
                WiFi.localIP().toString().c_str(), HTTP_SERVER_PORT);
}

// ================= STATUS DUMP =======================
void printStatusDump() {
  const char* st = "UNKNOWN";
  switch (g_deviceState) {
    case STATE_BLE:             st = "BLE_PROVISIONING"; break;
    case STATE_WIFI_CONNECTING: st = "WIFI_CONNECTING";  break;
    case STATE_WIFI_CONNECTED:  st = "WIFI_CONNECTED";   break;
    case STATE_MQTT_CONNECTED:  st = "MQTT_CONNECTED";   break;
    case STATE_CONFIG_UPDATING: st = "CONFIG_UPDATING"; break;
  }
  Serial.printf("\n--- [STATUS %lus] ---\n", millis() / 1000);
  Serial.printf("  State:   %s\n",   st);
  Serial.printf("  WiFi:    %s\n",   g_wifiConnected
                 ? WiFi.localIP().toString().c_str() : "Disconnected");
  if (g_wifiConnected) Serial.printf("  RSSI:    %d dBm\n", WiFi.RSSI());
  Serial.printf("  NTP:     %s\n",   g_timeSynced    ? "Synced"    : "Pending");
  Serial.printf("  MQTT:    %s\n",   g_mqttConnected ? "Connected" : "Disconnected");
  Serial.printf("  BLE:     %s\n",   g_bleActive     ? "Active"    : "Off");
  Serial.printf("  Relay:   %s\n",   (digitalRead(RELAY_PIN) == LOW) ? "ON" : "OFF");
  Serial.printf("  Heap:    %u (min: %lu)\n", ESP.getFreeHeap(), g_minHeap);
  Serial.println("-------------------\n");
}

// ================= SETUP ============================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n======================================");
  Serial.printf("  ESP32 IoT Firmware  v%s\n", FW_VERSION);
  Serial.println("  GPIO2  = Status LED");
  Serial.println("  GPIO23 = Relay (Active LOW)");
  Serial.println("  BLE → WiFi → NTP → MQTT TLS");
  Serial.println("======================================\n");

  pinMode(LED_PIN,      OUTPUT);  digitalWrite(LED_PIN, LOW);
  pinMode(RELAY_PIN,    OUTPUT);  digitalWrite(RELAY_PIN, HIGH);  // Relay OFF initially (Active LOW)
  pinMode(RESET_BUTTON, INPUT_PULLUP);

  initAppWatchdog();

  WiFi.mode(WIFI_MODE_STA);
  WiFi.disconnect(false, false);
  delay(100);

  buildDeviceIdentity();
  crashCounterCheck();

  g_prefs.begin(NVS_NAMESPACE, true);
  g_ssid     = g_prefs.getString("ssid",     "");
  g_password = g_prefs.getString("password", "");
  g_prefs.end();

  Serial.printf("[SYS] SSID: %s\n", g_ssid.length() > 0 ? g_ssid.c_str() : "(none)");
  Serial.printf("[SYS] Relay on GPIO%d (Active LOW - ON = LOW, OFF = HIGH)\n", RELAY_PIN);

  mqttSetupClient();

  g_minHeap = ESP.getFreeHeap();

  if (g_ssid.length() > 0) {
    connectWiFiNonBlocking();
  } else {
    initBLE();
    g_deviceState = STATE_BLE;
  }
}

// ================= LOOP =============================
void loop() {
  esp_task_wdt_reset();

  handleWiFi();
  handleNTP();
  mqttService();
  handleAsyncWifiTest();
  handleDeferredWifiUpdate();
  handleResetButton();
  handleWifiScanSM();
  
  updateSystemLedState();
  updateStatusLed();

  if (g_wifiConnected && millis() - g_lastHttpPoll > HTTP_POLL_INTERVAL_MS) {
    g_lastHttpPoll = millis();
    g_httpServer.handleClient();
  }

  if (g_mqttConnected && millis() - g_lastSend > DATA_PUBLISH_INTERVAL_MS) {
    g_lastSend = millis();
    publishData();
  }

  if (millis() - g_lastStatusDump > STATUS_DUMP_INTERVAL_MS) {
    g_lastStatusDump = millis();
    printStatusDump();
  }

  g_minHeap = min(g_minHeap, (unsigned long)ESP.getFreeHeap());

  // BLE stability
  if (g_bleActive && g_pServer &&
      g_pServer->getConnectedCount() == 0 &&
      g_wifiState == WIFI_SM_IDLE &&
      millis() - g_bleStartTime > BLE_PROV_TIMEOUT_MS) {
    if (!g_bleRestartLocked) {
      if (g_bleRestartCount < BLE_MAX_RESTARTS) {
        g_bleRestartCount++;
        Serial.printf("[BLE] Prov timeout — adv restart %d/%d\n",
                      g_bleRestartCount, BLE_MAX_RESTARTS);
        if (BLEDevice::getInitialized()) {
          BLEDevice::getAdvertising()->stop();
          delay(BLE_DEINIT_DELAY_MS);
          BLEDevice::getAdvertising()->start();
          g_bleStartTime = millis();
        } else {
          stopBLE();
          delay(BLE_DEINIT_DELAY_MS);
          initBLE();
        }
      } else {
        g_bleRestartLocked = true;
        Serial.println("[BLE] Restart limit reached");
      }
    }
  }
}