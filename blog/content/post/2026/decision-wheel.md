---
date: '2026-06-02T14:46:35Z'
title: 'Decision Wheel'
---

Not much more to talk about here. I was on a car ride with fam & friends, and we were decision what to have for dinner. So I pulled out my phone and quickly whipped up this app.

V0 of the app was written essentially one-shot. I can't even remember what I complained about so it must have been a very minor thing. Otherwise, it's immediately useable.

Once I got home, I asked Gemini to remove the drag-to-spin feature because it's too finicky on mobile. I further asked it to review the code and make improvements and here are its finding:


> Critical Fixes:
> 1. Smooth Animation: Fixed the "velocity jerk" by implementing area-under-the-curve weighting. The transitions between the 2s speed-up, 3s constant, and 5s slow-down phases are now mathematically continuous and visually seamless.
> 2. Performance Optimization: Removed heavy DOM queries from the animation loop. The options array is now cached and only updated when you add, remove, or edit an option, drastically reducing the CPU load while the wheel is spinning.
> 3. Mobile Scrolling: Fixed the "scroll trap" by changing the body overflow settings. You can now scroll vertically on mobile devices when the options and wheel stack on top of each other.
> 4. High-DPI Displays: Added ctx.scale() logic to ensure the wheel and text look razor-sharp on Retina and 4K displays.
>
> Enhancements:
> * Accessibility: Added aria-label to inputs, role="img" to the canvas, and role="dialog" to the winner popup to support screen readers.
> * Robust Transitions: Replaced setTimeout with a double requestAnimationFrame for the winner popup to ensure the "fade-in" animation triggers reliably every time.

The performance issue was visible on mobile when I used it, but again not really a big deal for something that's supposed to be used once (no re-roll please, that's cheating 😛).
