# TF2 Hub

An unofficial fan page for Team Fortress 2 jumping. The home page links to separate pages for maps, records, ranks, Tempus and Jump Academy servers, the jump encyclopedia, and links.

The map page requests the [Tempus API](https://tempus2.xyz/apidocs/) directly and falls back to `data/tempus-fallback.json`. It shows Tempus screenshots in a grid, with list and table layouts. The profile suggestion looks up a player with `GET /search/playersAndMaps/{name}` and `GET /players/id/{id}/stats`. The tier it suggests is labeled as a suggestion from class rank and completion count.

Finished map names come from the Cloudflare Worker at `https://tf2-hub-plaza-relay.confusion-quartz.workers.dev`. The source is `relay/`. The page sends `POST /player-records` with the Tempus player id. The worker requests `GET https://api.tempusplaza.com/players/{id}/records` and returns only the map name and class for rows with a duration. It does not write those lookups to a database or the repository. The browser holds the list for the visit. If the worker does not respond, the suggestion stays on the rank band and says the finished list did not load.

The worker allows browser calls from `https://graru1-wolfy.github.io` and from local previews on `localhost` or `127.0.0.1`. A new `workers.dev` address can answer those calls with a Cloudflare bot challenge. When that happens the suggestion keeps the rank band and says the finished list did not load. After the Cloudflare account is claimed, later deploys from `relay/` use `npx wrangler login` and `npx wrangler deploy`.

Jump Academy addresses are parsed from the public [servers page](https://jumpacademy.tf/servers). Name, map, player counts, and whether the server asks for a password come from a Steam server query (A2S_INFO) stored in `data/jump-academy.json`. Tempus password flags from the same query are stored in `data/server-passwords.json`. The browser cannot send that query itself. Rank limits are read from Tempus server names only. Jump Academy has no rank requirement. Latency is a regional estimate, not a measured ping, and tier is inferred from the server name.

`.github/workflows/refresh-jump-data.yml` refreshes the data files hourly. GitHub may delay or skip that run.

## Run locally

Serve the folder so the pages can read the JSON files:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

Team Fortress 2 is a trademark of Valve Corporation. This page is not affiliated with Valve.
