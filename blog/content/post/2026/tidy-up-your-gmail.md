---
date: '2026-02-21T09:25:12Z'
title: 'Tidy Up Your Gmail'
tags:
- computer
- tips
---

Here's how I manage to stay on top of my infinitely large gmail inbox:

## Emails to be kept forever

Create a label for emails to be kept forever, I call this `indef` - short for indefinite. Add this label to all important emails to make sure they don't get accidentally deleted.

The hotkey `l` (lima) can be used to quickly add a label to an email.

### Adding label to **every** email in the thread

Gmail by default arranges related emails into thread. However, labeling an email only labels *that email*, not the entire thread it belongs to. This has been a very long standing issue for Gmail.

To work around this issue, you can [create an Appscript](https://script.google.com/home) to periodically add a label to *all emails* in a thread, if one email has that label. Don't forget to **setup a periodic trigger** for the script to run.

{{< details summary="Apply label to thread script" >}}

```js
/**
 * @OnlyCurrentDoc
 *
 * This script ensures that if any message within a thread has a specific label,
 * the entire thread is given that same label. It is designed to run automatically.
 */

/**
 * The main function that iterates through all user labels and applies them to the parent threads.
 * You should set up a time-driven trigger to run this function daily.
 */
function applyLabelsToThreads() {
  try {
    // Get all labels created by the user. This excludes system labels like 'Inbox' or 'Spam'.
    const userLabels = GmailApp.getUserLabels();

    console.log(`Found ${userLabels.length} user labels to process.`);

    // Loop through each label.
    for (const label of userLabels) {
      const labelName = label.getName();
      // console.log(`Processing label: "${labelName}"`);

      let threadCount = 0;
      let start = 0;
      const batchSize = 100; // Process threads in batches of 100 to avoid timeouts.

      // Loop through threads for the current label in batches.
      while (true) {
        const threads = label.getThreads(start, batchSize);

        if (threads.length === 0) {
          // No more threads for this label.
          break;
        }

        // For each thread found, ensure the label is applied to the entire thread.
        // Gmail usually shows the label on the thread if one message has it,
        // but this makes it explicit and ensures consistency.
        for (const thread of threads) {
          thread.addLabel(label);
        }

        threadCount += threads.length;
        start += batchSize;

        // Break the loop if the last batch was smaller than the batch size,
        // indicating we've processed all threads.
        if (threads.length < batchSize) {
          break;
        }
      }

      console.log(`Finished processing ${threadCount} thread(s) for label "${labelName}".`);
    }

    // console.log("Script finished: All labels have been processed successfully.");

  } catch (e) {
    // Log any errors that occur during execution.
    console.error(`An error occurred: ${e.toString()}`);
    console.error(`Stack: ${e.stack}`);
  }
}

/**
 * A helper function to easily create the daily trigger for the script.
 * Run this function manually ONE TIME from the Apps Script editor to set up the automation.
 */
function createDailyTrigger() {
  const functionName = 'applyLabelsToThreads';

  // Check if a trigger for this function already exists to avoid duplicates.
  const existingTriggers = ScriptApp.getProjectTriggers();
  const triggerExists = existingTriggers.some(trigger =>
    trigger.getHandlerFunction() === functionName
  );

  if (!triggerExists) {
    // Creates a trigger that will run the main function every day
    // at a random time between 2 AM and 3 AM.
    ScriptApp.newTrigger(functionName)
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .create();

    console.log(`Successfully created a daily trigger for the function "${functionName}".`);
  } else {
    console.log(`A trigger for the function "${functionName}" already exists. No new trigger was created.`);
  }
}

/**
 * A helper function to remove the daily trigger.
 * Run this function manually if you want to stop the script from running automatically.
 */
function removeTrigger() {
  const functionName = 'applyLabelsToThreads';
  const triggers = ScriptApp.getProjectTriggers();
  let triggerRemoved = false;

  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
      triggerRemoved = true;
      console.log(`Trigger for function "${functionName}" has been removed.`);
      // We can break here assuming there's only one trigger for this function
      break;
    }
  }

  if (!triggerRemoved) {
    console.log(`No trigger found for function "${functionName}". Nothing to remove.`);
  }
}
```

{{< /details >}}

## Archive old unread emails

Use this search filter to search for old unread emails. Most of the time, they can be safely Mark-as-read (`Shift-i`) and Archive (`e`) or Delete (`#`)

```text
is:unread older_than:90d in:inbox
```

## Delete very old emails (**DANGEROUS**)

If you want to take it one step further, you can find and delete very old emails with this filter.

```text
older_than:1yr NOT in:indef
```
