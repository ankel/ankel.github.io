---
date: '2026-04-10T12:23:49Z'
image: cover.jpg
title: 'Sync options between two hosts'
tags:
- troubleshooting
- computer
- ssh
- tips
---

If you have more than one computer, at some point, you'd want to sync files between them. This post is about how I decided on what to use.

## The WHAT

### The requirements

Whatever tool(s) I ended up with, it must be able to **support SSH**.

These days, SSH is the standard for connecting between machines. It takes the encryption and the authentication part out of the equation, and I don't trust anything else to do a better job. So whatever happens, it must happens on top of SSH, not instead of SSH.

There's an exception, which I hope to goes into it on another day.

### The contenders

There are a few options to synchronize files, ranging from the most common options to the more exotic ones:

* Git repository.
* `rsync` or one of its variance.
* `unison`.
* `mutagen` (hint: the final winner).

#### Git repository (or another version control system - VCS)

Very simple and straight forward: 

* You set up a git repo, which can be hosted remotely (eg. Github, Gitlab, Codeberg) or on one of the machines in question.
* On machine X, you ran `git commit && git push`.
* On machine Y, you ran `git pull`.

This approach is great if you want to maintain a history of activities. However, for many practical purposes, **all** of the history is too much. 

Additionally, there are too many commands to run. And you need to remember to run them, or else there could be conflicts. Even if you run them all the time, the occasional conflicts are still unavoidable.

Occasionally check point your work is still great though, and the final solution will include git.

### Rsync

Rsync is the trusted companion when it comes to copying files between computers. There are too many options to list here, however, a basic command can be 

```
rsync -a --dry-run /path/to/local/ username@remote_host:/path/to/remote
```

With the slash (`/`) at the end of local, all files under local (ie. `local/file1`, `local/file2`, ...) will be sync between the local path and the remote path (ie. `remote/file1`, `remote/files`, ...). Rsync will intelligently ignore files that has not been changed between runs, so not all files are copied all the times. 

Rsync is even older git - it was first released in 1996 - and it's very much a battle-tested solution. However, it still one-too-many commands to run, and each run needs the full path of the folders to be synchronized. 

Additionally, rsync only runs one ways: it doesn't propagate changes from the other side, by default everything in target is overwritten from source.

Last but not least, this approach doesn't maintain a history of what happened. This can still be fine for many purposes, but for now let's continue.

### Unison

[Unison is a file-synchronization tool for OSX, Unix, and Windows](https://www.cis.upenn.edu/~bcpierce/unison/). In short, this fixes the one-directional problem of rsync. 

Unison also support "Profiles" which are pre-configured host / path and other configuration options to reduce the amount of typing (and typos). Seriously, the amount of configuration it supports is nothing short of mind blowing. 

The only complaint I have is that I still need to run a command to sync - though this can be easily automated eg. cronjob.

### Mutagen

[Mutagen](https://github.com/mutagen-io/mutagen) is the newest kid on the block. It's bi-directional, and it's automatic: it runs a daemon on both end of the sync connection and sync files without needing any other input.

This fixed my only complain about Unison... and it would have been the perfect solution if not for the fact that it's [no longer in active development since 2023](https://www.docker.com/blog/mutagen-acquisition/). And so it's not without issues, but also not [without workaround](#mutagen-permission-issue).

### The final solution

For my final solution, I combined git and mutagen. Mutagen to sync trivial edits between the two machines. And when I'm satisfied with the changes, I make a commit to preserve it for long term.

## The HOW

To create a new sync connection, run:

```
 mutagen sync create --name=a-descriptive-name --ignore-vcs /path/to/local username@remote_host:/path/to/remote
 ```

## Mutagen Permission issue

I ran into [this permission issue](https://github.com/mutagen-io/mutagen/issues/543) where `mutagen sync create` could not run the agent it has installed

```
Installing agent...
Error: unable to connect to beta: unable to connect to endpoint: unable to dial agent endpoint: unable to install agent: unable to invoke agent installation: remote error: zsh:1: permission denied: ./.mutagen-agent29d06cd9-a54a-4712-8863-f272b238bc05
```

I found [this page](https://chazeon.com/notes/software/mutagen-agents/) which described a fixed location for the agent at `.mutagen/agents/0.15.0/mutagen-agent`, however, as confirmed by the bug report above, this location no longer works for newer version of mutagen.

Fortunately, user [Tomasvrba](https://github.com/Tomasvrba) has also helpfully [provided a script](https://github.com/mutagen-io/mutagen/issues/543#issuecomment-3258357914) to fix the permission of mutagen agent. With this running in the background, a sync session completes successfully.

```
#!/bin/bash

echo "Watching for new mutagen agent files..."
while true; do
  for f in ~/.mutagen-agent*; do
    # Check if the file exists and is a regular file, but not executable
    if [ -f "$f" ] && [ ! -x "$f" ]; then
      chmod +x "$f"
      echo "Made $f executable"
    fi
  done
  sleep 0.1
done
```

