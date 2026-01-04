# Obsidian Cloud

Motivation: I wanted to make Obsidian to work more in line with how I think. Some (poorly explained) principles:

- Canvas-centric: I enjoy thinking on a canvas; it's easier to work on multiple threads, if necessary, is useful for brainstorming, etc. Canvases are like working memory; I want to make a canvas for each day, each project, each idea, etc.
- Daily canvas: I want to feel free to "mess up" a canvas/documents each day because I think well when typing my thoughts out. A daily journal helps, but a daily canvas is even better.
- Pinning: With the plain daily journal, it's annoying that everything is removed the next day and I have to go find the information I need. Pinning allows me to keep information I need from one day and copy it to the next daily canvas.
- Spontaneity: I want to be reminded of notes I've jotted in the past, almost like spaced repetition to help me learn. I also want, as I write, to see similar notes I've written, maybe have them bubble into my canvas.

## Features
- Daily canvas + Pinning
- TODO: easier "convert to file" - converting a card to a file takes too many steps. I want it to just take the first line as the title - just like Apple Notes.
- TODO: similar notes. See similar notes as I write.
- TODO: spaced repetition. Start each new canvas with a random note from the past.

## Development Setup

### Prerequisites
- [Bun](https://bun.sh/) installed
- An Obsidian vault where you want to test the plugin

### Building

```bash
# Install dependencies
bun install

# Build once (development)
bun run build.ts

# Build with watch mode (rebuilds on file changes)
bun run dev

# Production build (minified, no sourcemaps)
bun run build
```

### Loading the Plugin in Obsidian

The build script copies output files to `plugin-dir/`. To load the plugin in your Obsidian vault, create a symlink from `plugin-dir` to your vault's plugin directory:

```bash
# Create the symlink (run from the project root)
ln -s /path/to/your/vault/.obsidian/plugins/cloud-plugin plugin-dir
```

For example:
```bash
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/MyVault/.obsidian/plugins/cloud-plugin plugin-dir
```

After building, the following files are copied to your vault:
- `main.js` - The bundled plugin code
- `manifest.json` - Plugin metadata
- `versions.json` - Version compatibility info
- `styles.css` - Plugin styles

Then enable the plugin in Obsidian: Settings > Community plugins > Cloud.