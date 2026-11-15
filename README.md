# MY CITY 2.0

A refreshed top-down 2D city-builder prototype using Phaser 3 + TypeScript.

## Version 2.0 improvements
- New dark-green management UI
- Detailed top-down building drawings with lots, roofs, windows, shadows and service markers
- Grass texture and decorative trees
- Sidewalks, asphalt roads and road markings
- Simple moving cars on horizontal road segments
- Day/night tint
- Building selection, upgrade, bulldoze and road construction
- City budget, population, happiness, utility and jobs meters
- Expandable map
- Offline IndexedDB save/load and autosave
- Responsive mobile and desktop layout
- GitHub Actions workflow for Android debug APK

## Run locally
Requires Node.js 20+.
```bash
npm install
npm run dev
```

## Build web version
```bash
npm run build
```

## Android APK
Push this project to the `main` branch of a GitHub repository. Open Actions and run **Build MY CITY 2.0 APK**. Download the `MY-CITY-2.0-APK` artifact after a successful run.

The workflow uses Capacitor to generate the Android project in CI. No Android Studio is required on your phone.

## Important
This is a visual and gameplay prototype, not a finished commercial simulation. Cars currently move along horizontal road rows; full pathfinding, individual citizen AI, proper water/power pipe networks, zoning, missions, sound and cloud saves are future work. Game progress is saved locally in the browser/app using IndexedDB.
