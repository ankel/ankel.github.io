#!/bin/bash

# Check if an argument was provided
if [ -z "$1" ]; then
  echo "Usage: ./new-bundle.sh <bunle-name>"
  echo "Create new bundle based on the bundle archetype"
  exit 1
fi

# Get the current year
YEAR=$(date +'%Y')

# Execute the Hugo command
hugo new content "post/$YEAR/$1 -k bundle"