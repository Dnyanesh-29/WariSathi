# WariSathi

**WariSathi** is a comprehensive guide and tracking application designed specifically for the Warkari pilgrimage (Wari) in Maharashtra. Built with React Native and Expo, WariSathi ensures the safety, connectivity, and guidance of pilgrims walking from Dehu/Alandi to Pandharpur, even in crowded and network-congested areas.

## Features

* **Offline Maps & Navigation**: Navigate the Palkhi route seamlessly using MapLibreGL with offline-first Carto Voyager base maps. Track your location relative to the route without relying on cellular data.
* **Group Tracking (Online & Offline)**:
  * **Online Mode**: Sync your Dindi (group) members' real-time locations via Firebase Realtime Database.
  * **Bluetooth (Offline) Mode**: Stay connected even in dead zones. WariSathi uses BLE (Bluetooth Low Energy) via an ESP32 node to securely share coordinates with your nearby group members.
* **WariSathi AI Guide**: A built-in Gemini-powered chatbot accessible across the app. Ask questions via Voice or Text in **Marathi** or **English** about the pilgrimage schedule, nearby amenities, or emergency assistance.
* **Bilingual Support**: Fully localized in Marathi and English for maximum accessibility.
* **Points of Interest (POIs)**: Easily locate essential amenities like water tankers, medical camps, mobile toilets, and temporary shelters along the route.
* **Live Schedule**: Track the Palkhi schedule day-by-day with accurate distance calculations to the next halt.

## Tech Stack

* **Frontend**: React Native, Expo, React Navigation
* **Maps**: `@maplibre/maplibre-react-native`
* **Backend/Sync**: Firebase Realtime Database
* **Bluetooth Mesh/Sync**: `react-native-ble-plx` interfacing with an ESP32 node
* **AI Integration**: `@google/generative-ai` (Gemini 1.5/3.5 Flash), `expo-speech`, `expo-speech-recognition`
* **Styling**: React Native StyleSheet, Google Poppins Font

## Getting Started

### Prerequisites
* Node.js & npm/yarn
* Expo CLI
* Android Studio (for native Android builds)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dnyanesh-29/WariSathi.git
   cd WariSathi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   Place your `google-services.json` in the root directory.

4. **Configure Gemini API:**
   Add your Gemini API Key in `src/services/GeminiService.ts` or set it up via environment variables.

5. **Run the app:**
   WariSathi relies on native modules (MapLibre, BLE, Firebase). Use Expo Dev Client:
   ```bash
   npx expo run:android
   # OR
   npx expo start --dev-client
   ```

## ESP32 Node Setup (Optional)
To use the offline Bluetooth tracking feature, you need an ESP32 configured as a BLE relay node broadcasting the `WariSathi_Node` service. The firmware for the ESP32 is managed separately.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
