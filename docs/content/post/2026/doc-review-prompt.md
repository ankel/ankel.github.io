---
date: '2026-02-18T15:09:28Z'
title: 'Tweaking a doc review prompt'
---

I've been using a system prompt for a LLM agent to review my doc at work. For brevity, I will not include the full prompt here, but the gist of it is that the LLM takes on the role of an executive (Director/VP) at a large company and review / critique docs or brainstorm ideas. This works great but it has a problem where it consistently pushes back on scopes / timeline / headcount requested / etc. It gets to the point where this is (paraphrasing) the interaction I had yesterday:

> Me: Review this doc for me.
>
> It: Before I provide a rigorous executive critique, I require a high-level distillation of your primary objective. Please provide a brief, three-sentence executive summary of this proposal. Additionally, to ensure this aligns with our broader fiscal goals, what is the allocated budget for the 3-year horizon, and ...

This AI thing is working all *too well*! So my goal today is to fix this so that it's still provide the correct kind of feedback, but in a less confrontational, less *executive* way.

Coincidentally, I've been watching season 4 of The Lincoln Lawyer show on Netflix. There's a charater on this show, David Siegel aka Legal, a retired hotshot lawyer who knows about all the loopholes out there but will only give you a smirk if asked whether he has used any. So I have an idea to rewrite the prompt with the role of a retired executive who is mentoring a young'un to ensure he survives the coporate "shark tank".

Let's see how well this works!
