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
math: true
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

I ended up spending several days learning about LLM operations. Here's what I landed on (and why):

* Models are run using [oMLX](https://github.com/jundot/omlx). This app has several benefits: 1) it's mac native 2) runs on top of Apple inference framework (MLX) and 3) has great caching and other configuration options.
* For models, the Qwen 3.5 family models were good enough for me, with 4B one for faster testing and 8B one as an all-around good solution. Gemma 4 e2b is another honorable mention.

{{< details summary="How does a LLM generates text" >}}

Some disclaimers: 

* I'm not the authority on any of these. These are just bits and pieces that I picked up while trying to run LLM locally.
* Below I will use  "LLM / the model" whenever I (vaguely gesturing) refer to the weights (parameters), layers, neural networks, or the runner / engine that execute the maths behind the model, or other things.
* I'll also just call token "word". In textual format, an English word on average is 1.3 tokens, but tokens also work in other modal contexts such as sounds, pictures, even videos! We'll just stick with words for simplicity.

To start with, the process of the LLM generating output is called inference. There are two steps of inference: learning about the prompt (prefilling), and generating the next word (decoding).

---

Backward as it sounds, **decoding** is easier to understand, so let's start with that. Given some internal state, the inference engine will run through the model and generate a list of words and their probability. Then the model will pick one of them as the next word, and update its internal state accordingly. 

One important thing to underline here is that the engine must execute the entire model to generate one word (worse, one token). Let's look at an example, the latest [Gemma 4 models](https://ai.google.dev/gemma/docs/core#gemma-4-inference-memory-requirements) ranges from "effectively" 2 billion parameters to 31 billion. At a typical implementation (BF16), each parameter is a 16-bit (2 bytes) floating point number. Let's look at how much memory and how fast do we need them:

$$
\text{Memory (GB)} = \frac{\text{Parameters} \times \text{Precision (bits)}}{8}
$$


$$
\text{Bandwidth (GB/s)} = \text{Memory (GB)} \times \text{Tokens per Second} 
$$

So for the 2 billion variant, you'd need `4 GB` (~4 billion bytes) of memory to store them. Each token generation needs to read and run computations on those `4 GB`, which means at a rate of 10 words per seconds (very slow!), you'd need to be able to transfer `40 GB per sec`. Similarly, the largest model (31B at BF16) requires `62 GB` memory and mind boggling transfer rate of  `620 GB/s`. 

For a fun contrast: the bible is a few MB worth of words, and at a normal reading pace, it would probably take ~100h to go through from one end to another. For another fun contrast, compare those numbers with your home internet speed!

People have discovered two tricks to make this more tolerable:

1. The first trick is called **quantization**: for some reasons, the model does okay with less precise "floating point" numbers. We can use 8-bit (1 byte) per parameter and the final accuracy is only degraded by less than 1-2% (which, for a process that inherently stochastic, is basically indistinguishable). We can even go to 4-bit (0.5 bytes) per parameter and still arrive at ~10% degraded performance! This is really remarkable because we're now at one-quarter (1/4) of **both** the original memory (and transfer rate) consumption. Note that these are not really general-purpose floating point numbers - hence the quote - rather, they are specifically calculated binaries to maintain a higher degree of precision.

2. The second trick is **Mixture of Expert (MoE)**. Going back to Gemma 4, there's one variant called `26B A4B`. This is a MoE model, the name says that the model has 26 billion parameters in total, but for each token generated, it only uses (**A**ctivates) 4 billion parameters. This is akin to hiring a plumber, an electrician, or a roofer directly instead of hiring a single contractor. Embedded inside the model is a small neural network to decide which 4-billion-parameter is activated for the next token. As a result of this, per token, we only need to transfer 8GB (16-bit) or 2GB (4 bit) of memory. It's important to note that this only helps with the bandwidth number. For the best performance, the rest of the model **should** still be stored in GPU memory; but if you're willing to accept a lower speed, they can be spilled over to slower tiers of storage.

Even with those discoveries, these are still serious barriers to overcome. Let's put them to more concrete terms. On my Macbook Air, with a 7B model (at Q4 quantization), I get ~10 token-per-sec generation rate and around 200-300 tokens-per-sec prefill rate (we'll get into what this is in a bit). This is useable as a chat bot (for **one** single user!), but even too slow for testing of said chat bot, let alone vibe-coding. Specifically for vibe-coding use case, for each "code" token, the model often has to "think" ~10-100 tokens. And a non-trivial % of generated code needs to be completely throwaway and redone.

"What about Cloud models", you may ask. Frontier models like Claude or ChatGPT can be trillions of parameter large, and activating 10-100 of billions of parameters per generated token. And they needs to serve thousands to millions of users concurrently. So hopefully this helps explain the insatiable hunger for all thing AI related in infrastructure.

---

{{< /details >}}
