# GENXR-BENCH project website

This branch contains the static project website. The benchmark code is on the
`master` branch. Site files are at the branch root so GitHub Pages can publish
them directly.

## Deploy to GitHub Pages

Commit the site files and push the `website` branch:

```bash
git add .
git commit -m "Set up project website for GitHub Pages"
git push -u origin website
```

In [repository Pages settings](https://github.com/whuang37/genxr-bench/settings/pages):

1. Set **Source** to **Deploy from a branch**.
2. Select **website** and **/ (root)**.
3. Click **Save**.

The site will be available at <https://whuang37.github.io/genxr-bench/>.
Later pushes to `website` update it automatically. The `.nojekyll` file disables
Jekyll processing. No custom deployment workflow or build step is required.

## Preview and check

Use Node.js 24 and npm. From this branch root:

```bash
npm ci
npm run dev
```

Open <http://127.0.0.1:4178>. Press Ctrl+C to stop the server.
Use HTTP rather than opening `index.html` directly. XR app previews require
internet access for their CDN dependencies and a browser with WebGL support.

To check the JavaScript and create an optional local distribution:

```bash
npm run build
```

The generated `dist/` and installed `node_modules/` are ignored. GitHub Pages
serves the files at the branch root, so do not commit either directory.

## Edit

- `index.html`: title, authors, resource links, abstract, and citation.
- `styles.css`: page layout and styles.
- `data/`: benchmark scores, design scores, and demo app links.
- `assets/`: icons, images, and videos.
- `apps/`: browser-ready XR app outputs.
- Root JavaScript files: tables, charts, video playback, and app selection.

Update the paper and dataset links and draft citation details before release.
If the repository owner or name changes, update the canonical and social image
URLs in `index.html`.
