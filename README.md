# MY CITY – City Builder v1.0

A top-down 2D city-building prototype built with Phaser 3 + TypeScript. It runs in a browser and can be packaged for Android with Capacitor.

## Included in this first playable version
- 50×50 tile city map, expandable in 25×25 increments
- Pan, zoom, tap-to-build controls
- Roads, houses, shops, offices, parks, power, water, hospital and school
- Building selection, upgrade and bulldoze/refund
- Money, population, happiness, daily income/expenses
- Basic electricity and water supply-demand meters
- Pause, normal and fast simulation
- Offline save/load using IndexedDB and automatic save every 30 seconds
- Responsive layout for mobile and desktop

## Requirements
- Node.js 20 or newer
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite.

## Production web build
```bash
npm run build
npm run preview
```
The deployable website is created in `dist/`.

## Android APK
Install Android Studio and the Android SDK first.
```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
In Android Studio, build an APK using **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

For later web changes:
```bash
npm run android:sync
```

## Save data
Game progress is stored locally in the browser/app using IndexedDB. Clearing app/browser storage will remove the save. This version does not yet include cloud sync.

## Notes / next development milestones
This is a playable starter version, not a full commercial-grade simulation. Traffic routing, moving citizens, zoning demand, detailed utility networks, disasters, sound, tutorial, and cloud backup are planned for later versions.
