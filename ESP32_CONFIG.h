// ESP32 Configuration Header
// Paste your config code here
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

; Upload / Serial
upload_speed = 921600
monitor_speed = 115200

; Large partition table for BLE + WiFi + MQTT + JSON + TLS + OLED
board_build.partitions = huge_app.csv

; Build flags
build_flags = 
    -DCORE_DEBUG_LEVEL=0
    -DARDUINOJSON_ENABLE_ARDUINO_STRING=1
    -DCONFIG_ARDUINO_LOOP_STACK_SIZE=8192

; Libraries
lib_deps = 
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^7.0.4
    adafruit/Adafruit SSD1306@^2.5.7
    adafruit/Adafruit GFX Library@^1.11.5

; Optional stability improvements
monitor_filters = esp32_exception_decoder

; Recommended if using HTTPS/TLS heavily
board_build.flash_mode = dio