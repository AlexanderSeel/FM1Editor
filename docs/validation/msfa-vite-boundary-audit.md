# MSFA Vite public-asset boundary audit

Source commit: `fe2256e64ba9bf9745424eb329aabc6e61011d0c`

Software acceptance: **SUCCESS**

The recurring `audit:virtual-dx7` command now fails if the browser MSFA loader regresses to dynamically importing `public/virtual-dx7/fm1-msfa.mjs` through Vite. It requires static fetch + blob evaluation and an Emscripten `locateFile` mapping back to the original public WASM URL, and rejects the previous direct `import(moduleUrl)` / `?import` boundary.
