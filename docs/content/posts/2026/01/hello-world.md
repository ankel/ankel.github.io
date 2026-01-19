+++
date = '2026-01-18T19:44:46-05:00'
title = 'Hello World'
+++

This repository was created three years ago. Three years, and I finally gotten around to actually build the website. 

## Setup overview

The site is generated using Hugo. The Hugo content is stored under `/docs` folder. Each commit to `main` branch triggers a github action to build and push the page.

The Github action YAML is straightforward enough. The most tricky line is perharp the `publish_dir: ./docs/public`. This copy the content of the right place where Hugo built the site. Took me 4-5 tries to figured that out.
