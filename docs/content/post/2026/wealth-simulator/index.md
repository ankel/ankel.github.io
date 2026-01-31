---
title: Wealth Simulator
date: 2026-01-18T22:33:23
image: cover.png
tags:
    - Apps
---

I spent a weekend (one afternoon and one morning, to be specific) playing with Gemini. The result: [Wealth Simulator](https://ankel.github.io/wealth-simulator/)

The goal of this app is to run 1,000 iteration of Monte Carlo simulation to see how the future may play out, based on some provided inputs. The inputs are rather straightforward but do let me know if anything can be improved.

## Build and Deploy

The app is written as a single React app, and deployed as a static site on Github Pages. The build and deployment is automated through [Github Action](https://github.com/ankel/ankel.github.io/blob/cb48b711587796187101fd97522ea7aa38cf5eaa/.github/workflows/deploy-site-wealth-simulator.yaml).