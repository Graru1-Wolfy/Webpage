# TF2 Hub

An unofficial fan page for Team Fortress 2 jumping. It lists the Tempus jump catalog, records, and ranks, plus Tempus and Jump Academy servers.

The page requests the [Tempus API](https://tempus2.xyz/apidocs/) directly. If a request fails, it uses `data/tempus-fallback.json`. Jump Academy does not allow browser requests, so server status comes from `data/jump-academy.json`, parsed from the public [servers page](https://jumpacademy.tf/servers). Online counts include only those two networks. Latency is a regional estimate, not a measured ping, and tier is inferred from the server name.

`.github/workflows/refresh-jump-data.yml` refreshes both data files hourly. GitHub may delay or skip that run.

## Run locally

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

Team Fortress 2 is a trademark of Valve Corporation. This page is not affiliated with Valve.
