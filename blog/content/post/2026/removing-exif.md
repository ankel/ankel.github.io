---
date: '2026-07-27T14:59:16'
title: 'Removing Exif'
tags:
- computer
- tips
---

Every now and then I need to remove metadata from photos, and I started looking for various tools to do that... So here's how to do that - you're welcome, future-me.

- Install [Exiftool](https://exiftool.sourceforge.net/)
- Run `exiftool -r -all= -overwrite_original .` to scan and remove recursively from current folder.

Someday: Vibe code up a web app to remove this directly from the browser.
