# Contributing

## This repository is a mirror

Development happens in a private working repo. What you see here is an allowlisted
export of the parts that make sense to publish.

The practical consequences:

- **Pull requests are welcome**, but they are applied upstream by hand and arrive back
  here in the next sync. Your change will land; your commit SHA will not, so you get
  credited in the commit message instead.
- **Direct pushes to this repo get overwritten** by the next export. Open a PR or an
  issue rather than pushing, even if you have commit access.
- Anything referenced from the docs but missing from the tree was left behind on
  purpose, not by accident.

## Good contributions

The most useful contributions are in the data layer and the chart renderer, because
that is where the app meets the outside world and where it breaks.

- **Market data handling** — `src/services/yahooFinanceApi.ts`. This module fetches
  quotes and candles through three different transports depending on where the app is
  running: Electron IPC on desktop, `CapacitorHttp` on Android, and public CORS
  proxies in the browser. Bugs here usually look like "this ticker renders wrong" or
  "this timeframe is off by a session". `src/services/yahooFinanceApi.test.ts` pins
  the market-status and session-boundary logic — add a case there first, then fix it.

- **Chart rendering** — `src/components/StockChart.tsx`. Hand-written SVG: path
  scaling, gradients, crosshairs, and dashed segments for pre/post-market data. If you
  are fixing a visual bug, say which timeframe and which ticker reproduces it.

- **New tickers and asset classes.** Index symbols (`^GSPC`) and non-US listings take
  different code paths than plain US equities. Real reproductions are valuable.

Please **do not** send PRs that reformat files wholesale, swap the CSS for a framework,
or add a state-management dependency. The vanilla-CSS design system in
`src/index.css` and the plain-React state in `src/App.tsx` are deliberate.

## Before opening a PR

```bash
npm run test
npm run build
```

Both must pass. If you touched the Android container, also confirm it assembles:

```bash
npm run android:build:test
```

Match the surrounding style: TypeScript interfaces for props, Lucide icons from
`lucide-react`, and comments that explain *why* something is the way it is, not what
the line does.

## A note on market data

This app reads from unofficial public endpoints that can change or rate-limit without
notice. If data stops loading, check whether the upstream response shape changed
before assuming the bug is local.
