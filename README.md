# InstaLite

Instagram in a filtered WebView: Reels, Explore/Search and the main feed are hidden; stories stay.

## Get the APK from GitHub (no Android Studio needed)
1. Push this repo to GitHub (branch `main`).
2. Open the **Actions** tab -> **Build APK** -> latest run.
3. Download **InstaLite-debug-apk** from *Artifacts*, unzip it, and install `app-debug.apk` on your phone
   (allow "install unknown apps" when asked).

You can also start a build manually: Actions -> Build APK -> **Run workflow**.

### Optional: a Release page with a download link
```
git tag v1.0
git push origin v1.0
```
The workflow then attaches the APK to a GitHub Release.

## Build locally
Open the folder in Android Studio and press Run.

## Tweaking the filters
Selectors live in `app/src/main/assets/filter.js`. If Instagram changes its layout and something reappears, edit there and push again.
