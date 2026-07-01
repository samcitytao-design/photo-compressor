# Image Compressor Clone Design

## Goal

Build a refined local clone of `https://010yasuo.vercel.app/`: a browser-only image compression tool with the same core capabilities and a cleaner, more responsive interface.

## Scope

- Static single-page app that can run by opening `index.html` directly.
- No server upload or external processing for user images.
- Support click-to-upload and drag-and-drop upload for multiple image files.
- Show original and compressed previews for the selected image.
- Support output format selection: WebP, JPEG, PNG.
- Support quality and scale controls.
- Show per-image original size, compressed size, compression ratio, and dimensions.
- Show batch list, current-image navigation, aggregate batch savings, and bulk ZIP download.
- Preserve the original file name for downloads, replacing only the extension with the chosen output format.
- Support fullscreen preview for image inspection.

## Architecture

The app will use three files:

- `index.html`: semantic structure for upload, previews, controls, batch list, toast, and fullscreen preview.
- `styles.css`: responsive desktop/mobile layout, visual system, states, and control styling.
- `script.js`: all app behavior and browser-side compression logic.

The browser will read files with `FileReader` and object URLs, draw images into a `canvas`, then export compressed output with `canvas.toBlob()`. Multi-image downloads will be generated with JSZip loaded from CDN.

## Data Flow

1. User selects or drops image files.
2. The app filters non-image files and adds unique image files to app state.
3. The selected image is decoded into an `Image`, rendered into a canvas at the chosen scale, and exported in the chosen format and quality.
4. Preview, size, dimension, and ratio data are updated.
5. Batch items are recompressed when format, quality, or scale options change.
6. Single download saves the selected compressed image; bulk download compresses all images and packages them into a ZIP.

## UI Design

The first screen is the tool itself, not a marketing page. The layout uses a quiet work-focused interface:

- Header with concise product title and privacy note.
- Large upload drop zone.
- Compact settings rail or panel for format, quality, scale, and preserved filename preview.
- Side-by-side preview comparison on desktop.
- Stacked preview and controls on mobile.
- Batch list with thumbnails and compression metrics.
- Clear primary download actions.

The palette should avoid a one-note blue look: use neutral surfaces, blue for primary actions, green for savings, and red only for errors or negative compression.

## Error Handling

- Ignore non-image files and show a toast explaining how many were skipped.
- If image decoding or canvas export fails, mark that item as failed and keep the rest usable.
- If WebP is unsupported, hide or disable the WebP option and fall back to JPEG.
- If compression makes a file larger, show a negative ratio with neutral wording instead of treating it as a fatal error.

## Testing And Verification

- Verify the app loads from a static file or local server.
- Verify upload, drag/drop, quality changes, scale changes, format changes, naming preview, single download, and ZIP download.
- Verify responsive layout at desktop and mobile widths.
- Verify there are no visible layout overlaps in the initial and post-upload states.

## Out Of Scope

- Server-side compression.
- Account system, cloud storage, or analytics.
- Advanced image editing such as crop, sharpen, or denoise.
