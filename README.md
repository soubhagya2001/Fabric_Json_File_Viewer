# Fabric JSON File Viewer

A React + Fabric.js application to load, visualize, and export canvas data from:

- Fabric JSON files (`.json`)
- SVG files (`.svg`) converted to Fabric JSON in-browser
- ImageMagick-style metadata JSON (rendered as a structured dashboard view)

The app provides an interactive canvas preview, zoom controls, and JSON export for the currently rendered Fabric canvas.

## Features

- Upload and render Fabric JSON on canvas
- Upload SVG and convert it to Fabric JSON automatically
- Auto-fit loaded objects into the visible canvas area
- White canvas background for better SVG visibility
- Zoom in, zoom out, and reset zoom
- Export current canvas state as JSON
- Metadata dashboard rendering for ImageMagick JSON payloads

## Tech Stack

- React 19
- Fabric.js 7
- Vite 8
- ESLint 9

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development

```bash
npm run dev
```

Open the local URL shown in terminal (typically `http://localhost:5173`).

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Usage

1. Click **Browse JSON...** to load a Fabric JSON or metadata JSON file.
2. Click **Browse SVG...** to load an SVG and convert it to Fabric JSON.
3. Use zoom controls from the sidebar.
4. Click **Export to JSON** to download the current canvas state.

## Project Structure

```text
myfirstapp/
	public/
	src/
		assets/
		App.css
		App.jsx
		index.css
		main.jsx
	index.html
	package.json
	vite.config.js
```

## Notes

- SVG parsing depends on Fabric.js support for SVG elements and attributes.
- Very complex SVGs (filters, uncommon masks, external references) may render partially.
- Exported JSON represents the Fabric canvas state after load/transform operations.

## License

This project is for development/demo usage. 
