---
date: '2026-05-03T10:35:49Z'
draft: true
title: 'Diary Pal'
tags:
- computer
- apps
- programming
- baby-bonding-2026
- vibe-coding
---

# Diary of diary pal

Note: these are all fragments to be editted later.

## Day 0

Creating architecture doc, discussiing what to use. Biggest decision was Google adk, go or python, or something else. Ultimately I decided to go with adk-go.

## Day 1: creating an UI.

I first used gemini web app, it failed miserably. I then downloaded Antigravity and it worked much better. Especially with chrome integration, the development cycle is mostly hand off: I tell it what to do, it does it, check its work in the browser, and fix any issue arise. I just need to provide feedbacks ie different color, different arrangement, etc.

## Day 2: starting on the backend

Creating an HTTP server for the backend. The HTTP part is simple enough, decided to go with gin to see what it looks like.

The ADK part is significantly more problematic. go-adk is not in training data set so a lot of auto suggestions are just bad. Also its doc was written as a framework (you work within it), not a library (you pick and choose what to use, where, and when). 

Eventually what helped was to run gemini cli in both folders, letting it loose on the adk examples, then ask it to reimplement each of the pieces over on my project.

## Day 3: redo in python.

I should have checked for this first. there's no local llm supported in go-adk https://github.com/google/adk-go/tree/8369260531b706978d5200feb4ab1d80743c4d5e/model

The python adk looks to at least support Anthropic style API https://github.com/google/adk-python/tree/83f981761b963ca51a286cbd004c043567517a3c/src/google/adk/models so I could have convert to python ADK (or reimplement it in Golang). but instead I'm probably going all the way to Langgraph.

Vibe coding with an established library / framework is significantly easier. Most of my experience could be described as zero shot. I barely need to 
steer it - not that I know enough to provide any useful directions. I essentially told it what I want at a very high level, and it implemented a very good graph, with all the nodes, edges (and conditions), state objects, etc without any input from my side.

Aside from quickly getting the project off the ground, this has the added benefits of allowing me to quickly learn Lang graph / Lang chain. Doing a toy project to learn isn't a new thing, but with AI, I get to really dive straight into the meat of it and not messing around with boiler-plate / scaffolding code. Furthermore, gemini provides me with a good idea of what to read up about. In essence, this is the same as following a tutorial, but instead of re-creating something that someone else has already done, I get to decide what "this tutorial" is about.

And that segway into what I had to be careful about generated code: they follow older conventions and styles. For well-established languages or libraries, this is basically good enough. However, with something that's rapidly changing like LLM, this is not. Many times Gemini gave me an advice that's no longer correct (see the latter section for an example), so I still need to read the doc.

And speaking of docs, I must say that Python project really needs to be better at documenting their API, and maybe consider stop using `**kwargs`. Every public API in the Lang-X ecosystem takes a dict of undetermined values, and very few actually documents the accepted values inside them. Coupling with the type-free nature of Python, best case, you get a type error at some point during run time; worst case, the LLM hallucinated up a legitimately-looking key that doesn't work and you'll never know why.

Regardless, at the end of the day, I get something that seems to work reasonably well.

## Day 4: Running LLM locally.

This is another wild adventure. All I have is a M4 Mac Air - it's great laptop and I will not hesitate buying it again. However, it doesn't have the power to run complicated models. Larger (and more capable) models are very slow and not suitable for rapid testing during development, whereas small and fast models aren't good enough and tends to on a wild tangent when being asked to do very simple things.

I ended up spending several days testing and choosing how to run
