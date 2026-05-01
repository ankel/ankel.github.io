---
date: '2026-04-21T18:13:16Z'
title: 'Simple Secret Manager - or Rust vs Go'
draft: true
tags:
- computer
- apps
- programming
---

## Simple secret manager

Over the first week or two of my parental leave, I decided to work on a toy project. Here it is: https://github.com/ankel/simple-secret-manager

## Rust vs Go

There are two implementations of SSM in that repo, one in Rust and one in Golang. I've been spending the last few years working with Go, so that part is perhaps obvious, and as for Rust, well I just wanted to learn a new language. So how was it?

Let's start with some observations:

### Line of code

Number wise, the Go code base was around two thousand lines. Compare to that, Rust was around sixteen (16) thousand lines. Now, to be fair, I was trying to learn a new language, so the two implementation was not directly comparable to each other. And I also went out of my way to explore Rust standard functions and libraries. But still, there definitely was not 8x as much features packed in one version vs the other.

Why was there so much additional code? I suspect the garbage collector (and lack thereof) played a major role. I have spent quite a bit of time making sure the borrow-checker happy, and it's a tough one to please. I can only imagine how much more work it would be in a large scale project.

On the other hand, the compiled code is much smaller. The Go code compiled to 4-5 MB whereas the Rust binary was only around 2.5MB. I suppose the difference would be much less consequential at a larger project.

### Standard library

### Error handling

## Final thoughts
