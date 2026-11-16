# TF2 Hub

An unofficial fan page for Team Fortress 2 jumping. The home page links to separate pages for maps, records, ranks, Tempus and Jump Academy servers, the jump encyclopedia, and links.

The map page requests the [Tempus API](https://tempus2.xyz/apidocs/) directly and falls back to `data/tempus-fallback.json`. It shows Tempus screenshots in a grid, with list and table layouts. A player lookup uses `GET /search/playersAndMaps/{name}` and `GET /players/id/{id}/stats`, then changes the same map list. Suggestions include finished maps until the player hides them. All maps keeps the catalog and marks finished runs.

Finished runs come from the Cloudflare Worker at `https://tf2-hub-plaza-relay.confusion-quartz.workers.dev`. The source is `relay/`. The page sends `POST /player-records` with the Tempus player id. The worker reads that player's Tempus Plaza records, ranks, the public map list, and the class points of the rank immediately above. It returns class, zone type, tier, rating, placement group, the player's own duration, bottom-time flag, and points for each finished run, plus map tags and the Plaza cutoff ranks for G1 through G4. `POST /group-times` returns the duration at a requested cutoff rank and drops every name on that row. It does not return other players' names, and it does not write lookups to a database or the repository. The browser holds the response for the visit. The suggestion does not use that neighboring rank.

The comfortable tier is the highest tier that accounts for at least 5% of that class's finished maps, and at least three maps. A handful of much harder finishes does not raise it. Practice stays on that tier, the step up is the next tier, and the points goal uses the [Tempus Plaza points calculator](https://github.com/ShadowOfLightTF2/tempus-plaza). A map on a tier the player has not finished is counted as G5, which is completion points only. A finished map shows its group and points, and the time still needed for the next group from G5 through G1. A finish within 2 seconds of that group is included in the points suggestions. The group cutoff time comes from the rank Plaza publishes for that group, and the relay returns only that time. The published worker shows the group and points without the seconds until `relay/` is deployed. The automatic points limit is two tiers above the comfortable tier. The tier buttons raise or narrow that limit. The tag chips list every tag on that class's maps, finished or outside the suggestion, and selecting one keeps the maps that have it. Soldier, Demoman, and overall share one position ladder. The API title is the group name. Chat numbers each group below Duke into five levels, where I is the best fifth and V is the last: Prince through Count are one rank per number, and the wider groups split evenly by five. Emperor through Duke, and Peon, have no number. Rank 1000 is Jester V and rank 1001 is Plebeian I. The points remaining are the gap to the last rank of the next number, so a Plebeian IV is measured to Plebeian III and a Plebeian I is measured to Jester V. The points goal can also aim at any other numbered title, or at Emperor through Duke. The cutoff is the last rank that still holds that title. Peon is not a target because it has no last rank. The choice lasts for the visit. The page keeps the rank numbers and point totals. The profile has no overall title field, so the suggestion uses the Soldier or Demoman rank for the class being viewed. A rank-band suggestion is used only when the finished runs do not include tiers. If the worker does not respond, the suggestion says the finished list did not load.

The worker allows browser calls from `https://graru1-wolfy.github.io` and from local previews on `localhost` or `127.0.0.1`. A new `workers.dev` address can answer those calls with a Cloudflare bot challenge. When that happens the suggestion keeps the rank band and says the finished list did not load. After the Cloudflare account is claimed, later deploys from `relay/` use `npx wrangler login` and `npx wrangler deploy`. A local preview can point at `wrangler dev` on port 8787 by opening the map page with `?local-relay=1`. That flag is ignored on the published site.

Jump Academy addresses are parsed from the public [servers page](https://jumpacademy.tf/servers). Name, map, player counts, and whether the server asks for a password come from a Steam server query (A2S_INFO) stored in `data/jump-academy.json`. Tempus password flags from the same query are stored in `data/server-passwords.json`. The browser cannot send that query itself. Rank limits are read from Tempus server names only. Jump Academy has no rank requirement. Latency is a regional estimate, not a measured ping, and tier is inferred from the server name.

`.github/workflows/refresh-jump-data.yml` refreshes the data files hourly. GitHub may delay or skip that run.

## Run locally

Serve the folder so the pages can read the JSON files:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

Team Fortress 2 is a trademark of Valve Corporation. This page is not affiliated with Valve.
