+++
date = '2026-01-18T19:44:46-05:00'
title = 'Hello World'
+++

This repository was created three years ago. Three years, and I finally gotten around to actually build the website out of it :D

## Setup overview

The site is generated using Hugo. The Hugo content is stored under `/docs` folder. Each commit to `main` branch triggers a github action to build and push the page.

The Github action YAML is straightforward enough. The most tricky line is perharp the `publish_dir: ./docs/public`. This copy the content of the right place where Hugo built the site. Took me 4-5 tries to figured that out (reading the build output was very helpful!)

## Hugo configuration

Hugo out of the box uses TOML (though it can also support YAML and JSON). These days, my editor of choice is VS code. And it's a bit mind-blowing to discover that VS code out of the box does not support TOML.

I have written too much YAML (and hated every minute of it), but the alternative is to install and 3rd party plugin for TOML support - which, as of right now, is [this one](https://github.com/tamasfe/taplo). Decisions, decisions, decisions....
