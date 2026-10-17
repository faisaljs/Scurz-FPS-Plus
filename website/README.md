# Scurz FPS Plus Website

A small static Minecraft-inspired website for `faisaljs/Scurz-FPS-Plus`. It automatically fetches public GitHub Releases in the browser and offers direct downloads for attached `.zip` or `.mcpack` assets.

## Deploy with GitHub Pages

1. Upload `index.html`, `styles.css`, `script.js`, and `favicon.svg` to the root of the repository or to a dedicated `docs/` folder.
2. If you choose `docs/`, put all website files in `docs/` and select **Settings → Pages → Deploy from a branch → main → /docs**.
3. For root deployment, select **Settings → Pages → Deploy from a branch → main → /(root)**.
4. The site URL should be `https://faisaljs.github.io/Scurz-FPS-Plus/` when Pages is enabled.

## Publish pack versions

The website reads `https://api.github.com/repos/faisaljs/Scurz-FPS-Plus/releases?per_page=100` dynamically. To publish a downloadable pack version:

1. Open the repository's **Releases** page and create a new release.
2. Use a release title/tag that identifies the build.
3. Attach the actual resource pack ZIP as a release asset (for example `Scurz-FPS-Plus-MC-1.20.1.zip`). Do not rely on GitHub's automatic **Source code (zip)** archive as the resource pack download.
4. In the release notes, include an explicit line such as `Minecraft versions: 1.20, 1.20.1`.
5. Publish the release. The website will detect the version labels and show direct asset links automatically; no site source edits are needed for each release.

The Minecraft version filter detects labels in release notes, titles, tags and attached asset filenames. Explicit notes are the most reliable approach when one build supports multiple game versions.

## Attribution

Original resource pack creator: **Scurz**. Compatibility updates: **NotGriaz**. Keep the original creator's credit and comply with the original pack's redistribution terms.

## Notes

- This is a static website; no server, framework, build step or GitHub token is required for a public repository.
- Direct downloads only appear for `.zip` and `.mcpack` files attached to a published GitHub release.
- GitHub Pages uses the repository's public releases. The API rate limit can occasionally delay loading; users can use the Refresh button.
