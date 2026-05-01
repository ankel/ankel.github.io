#!/bin/bash

# Check if an argument was provided
if [ -z "$1" ]; then
  echo "Usage: ./new-post.sh <post-name>"
  echo "Create new post based on the default archetype"
  exit 1
fi

# Get the current year
YEAR=$(date +'%Y')

# Execute the Hugo command
hugo new content "post/$YEAR/$1.md"