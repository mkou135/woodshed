# Solos offered on the page

Anything in this folder is **published on the public web**. Vite copies
`public/` verbatim into `dist/`, and `dist/` is what GitHub Pages serves, so a
file dropped here is downloadable by anyone with the site's URL.

That makes this folder a licensing decision, not a convenience. Put a
transcription here only if it is **your own work** and you are content to give
it away. Someone else's transcription — even one handed to you, even one
already circulating online — is theirs to publish, not yours. Most published
transcriptions also transcribe a copyrighted tune.

## Adding one

1. Copy the `.mxl` or `.musicxml` into this folder.
2. `npm run solos:manifest` — rewrites `manifest.json` from what is here.
3. Check the generated title reads well; edit `manifest.json` by hand if not.
   The script derives it from the filename and will not overwrite your wording
   unless you rerun it.
4. Commit both the score and the manifest, and push.

The dropdown appears on the analysis page as soon as the manifest lists at
least one solo, and stays hidden while it is empty. Removing a solo is the
reverse: delete the file, rerun the script, commit.
