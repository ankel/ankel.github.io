---
date: '2026-05-03T10:38:57Z'
title: 'Baby Sleep Sound'
image: cover.png
tags:
    - apps
    - computer
    - baby
    - vibe-coding
---

# White noise generator app

I have a newborn, which means my Youtube history is full of searches for white noise videos. And they work very well to put a baby to sleep. 

Adding some Gemini-powered vibe coding into the mix, allow me to present: [Baby sleep sound](https://ankel.github.io/apps/sleep-sound/) is a single page app white noise generator. Better yet, it's actually a single HTML file and can be opened locally (still need internet since it uses some Tailwind CSS though).

## How it works

True white noise is an equally random mix of every frequency. Using Web Audio API, the page periodically fills up a buffer full of random bytes. Playing that buffer and we get ourselves the white noise! 

Assuming no distortion by the audio processor, the speaker, the room or anything else, this should generate a sound with physically equal loudness across all frequencies. However, the human ear [perceives loudness differently depending on the frequency of the sound](https://en.wikipedia.org/wiki/Equal-loudness_contour). Long story short, **true white noise** has a lot of treble and sounds very harsh to the human ears. To address this, we can taper down the upper frequencies (pink noise), or even further quiet them  down (brown noise). You can [read more about them in Wikipedia](https://en.wikipedia.org/wiki/Brownian_noise#Explanation).

The implementation of these noises is very interesting. The pink noise is generated through [a series of seemingly-random coefficients](https://github.com/ankel/ankel.github.io/blob/26cd73e2bbac61df18334895a5e08aca5758adb4/sleep-sound/index.htm#L437-L445). While brown noise also uses seemingly random numbers, there are significantly fewer coefficients.

Below is Gemini's explanation for pink noise (Notes: the original values can be found on this mailing list https://www.musicdsp.org/en/latest/Filters/76-pink-noise-filter.html#pink-noise-filter)

>The specific decimal values are filter coefficients derived from an algorithm known as Paul Kellett's refined method. Paul Kellett, an audio engineer, mathematically calculated these exact numbers to create a highly CPU-efficient series of recursive filters (IIR filters). When the outputs of these specific filters (b0 through b6) are summed together, they closely approximate the 1/f power spectral density required for authentic pink noise.  

Its explanation for brown noise is a lot more questionable: 

> Brown noise, on the other hand, requires a steeper -6 dB per octave roll-off (1/f2). This happens to be the exact natural slope produced by a simple first-order low-pass filter, also known as a leaky integrator.
>
>The logic behind the brown noise algorithm you noticed (lastOut = (lastOut + (0.02 * white)) / 1.02) is exactly that: a leaky integrator. It mathematically integrates the white noise by continuously adding the new random value to the previous one. This integration creates the deep brown noise frequencies. The division by 1.02 is the "leak"—it slowly pulls the value back toward zero to prevent the accumulated numbers from drifting to infinity and causing the audio to clip.

While I was unable to confirm it entirely, the approach looks to be consistent with [Wikipedia's formula of a leaky integrator](https://en.wikipedia.org/wiki/Leaky_integrator), and a leaky integrator is indeed used in generating brown noise. Another subjective observation: my ear cannot tell this brown noise from a small sample of brown noises found on the internet.

## Adding shushing sound

My next step was to add a shushing sound. Apparently many babies like this - mine included. However, this sound is significantly harder to generate. Gemini chose to start with a white noise sample (uniformly random frequency) then put it through a low-pass filter. The final result doesn't sound like shushing at all!

I recorded my own shushing sound then put it through a spectrum analyzer to see if I can arrive at a better solution. Long story short: I could not. My gut feeling is that the shushing sound requires a specific distribution of frequencies, and sampling randomly is not sufficient. However, I lack the right knowledge to pursue this further. 

I also stopped pursuing it is because I ended up preferring this result: It sounds like the ocean waves crashing!

**Side note**: When I said "a spectrum analyzer", I mean an app I found on the store. It's amazing how we walks around with a mini physic lab in our pocket!

## Other flairs

I added a night sky visualization, a timer, and some option to make playing this on mobile better. As usual, let me know what you think!
