# Gym Tracker - Setup

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `gym-tracker`)
2. Push this folder to the repo's `main` branch
3. Go to repo Settings > Pages > Source: set to "GitHub Actions"
4. The included workflow (`.github/workflows/deploy.yml`) handles the rest
5. Your app will be live at `https://yourusername.github.io/gym-tracker/`

If deploying to a subpath (e.g. `/gym-tracker/`), update `svelte.config.js`:

```js
paths: {
    base: '/gym-tracker'
}
```

## How data works (v1)

Data is stored in your browser's localStorage. This means:
- Your workout logs persist between sessions on the same device/browser
- If you clear browser data, you lose your logs
- Data doesn't sync between devices

Google Sheets sync can be added later as a v2 feature.

## Project structure

- `src/lib/program.js` - Your 5-day workout program. Edit exercises here.
- `src/lib/store.js` - State management (localStorage persistence, PR tracking)
- `src/lib/ExerciseCard.svelte` - Exercise card component
- `src/lib/LogModal.svelte` - Bottom sheet for logging sets
- `src/lib/HistoryView.svelte` - Session history list
- `src/routes/+page.svelte` - Main app page
