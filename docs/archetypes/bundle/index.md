---
date: '{{ .Date | time.Format "2006-01-02T15:04:05Z" }}'
draft: true
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
---
