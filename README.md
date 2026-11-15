# TF2 Hub

An unofficial fan page for Team Fortress 2 jumping. The home page links to separate pages for maps, records, ranks, Tempus and Jump Academy servers, the jump encyclopedia, and links.

The map page requests the [Tempus API](https://tempus2.xyz/apidocs/) directly and falls back to `data/tempus-fallback.json`. It shows Tempus screenshots in a grid, with list and table layouts. The profile suggestion looks up a player with `GET /search/playersAndMaps/{name}` and `GET /players/id/{id}/stats`. The tier it suggests is labeled as a suggestion from class rank and completion count. Tempus does not publish the list of maps a player has finished.

Jump Academy addresses are parsed from the public [servers page](https://jumpacademy.tf/servers). Name, map, player counts, and whether the server asks for a password come from a Steam server query (A2S_INFO) stored in `data/jump-academy.json`. Tempus password flags from the same query are stored in `data/server-passwords.json`. The browser cannot send that query itself. Rank limits are read from Tempus server names only. Jump Academy has no rank requirement. Latency is a regional estimate, not a measured ping, and tier is inferred from the server name.

`.github/workflows/refresh-jump-data.yml` refreshes the data files hourly. GitHub may delay or skip that run.

## Run locally

Serve the folder so the pages can read the JSON files:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

Team Fortress 2 is a trademark of Valve Corporation. This page is not affiliated with Valve.
