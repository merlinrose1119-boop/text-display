/*
  ESP32 + MAX7219 LED matrix (FC-16, 4 modules): shows the latest text from the Text Display API.

  Libraries (Arduino IDE > Library Manager):  "MD_Parola"  and  "MD_MAX72XX"  (by MajicDesigns)

  Wiring (ESP32 -> LED matrix):
    5V    -> VCC
    GND   -> GND
    GPIO23 -> DIN
    GPIO18 -> CLK
    GPIO5  -> CS

  Only English letters, numbers and common symbols can be shown (the LED font has no Tamil).
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <MD_Parola.h>
#include <MD_MAX72xx.h>
#include <SPI.h>

// ---- change these ----
const char* ssid = "YOUR_WIFI";
const char* pass = "YOUR_PASSWORD";
const char* url  = "https://YOUR-APP.onrender.com/api/latest.txt";
// ----------------------

#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES   4          // number of 8x8 modules
#define CS_PIN        5
MD_Parola display = MD_Parola(HARDWARE_TYPE, CS_PIN, MAX_DEVICES);   // hardware SPI: CLK=18, DIN=23

char message[512] = "Connecting...";
String shownId = "";
unsigned long lastCheck = 0;
const unsigned long CHECK_EVERY_MS = 4000;

void showText(const char* t) {
  display.displayText((char*)t, PA_LEFT, 40, 1000, PA_SCROLL_LEFT, PA_SCROLL_LEFT);
  display.displayReset();
}

void checkMessage() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();                 // skip certificate check
  HTTPClient http;
  http.begin(client, url);
  http.setTimeout(10000);
  int code = http.GET();
  if (code == 200) {
    String body = http.getString();     // format:  id|text
    int bar = body.indexOf('|');
    if (bar > 0) {
      String id = body.substring(0, bar);
      String text = body.substring(bar + 1);
      text.trim();
      if (id != "0" && id != shownId && text.length() > 0) {
        shownId = id;
        text.toCharArray(message, sizeof(message));
        Serial.println("New message: " + text);
        showText(message);
      }
    }
  } else {
    Serial.println("HTTP error: " + String(code));
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  display.begin();
  display.setIntensity(5);              // brightness 0-15
  display.displayClear();
  showText(message);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    display.displayAnimate();
    delay(50);
  }
  strcpy(message, "Connected");
  showText(message);
  checkMessage();
}

void loop() {
  if (display.displayAnimate()) display.displayReset();   // keep scrolling the current text
  if (millis() - lastCheck > CHECK_EVERY_MS) {
    lastCheck = millis();
    checkMessage();
  }
}
