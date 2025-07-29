#!/bin/bash

echo "Generating code from Protocol Buffers..."

# Use locally installed buf
npx buf generate
echo "Code generation complete!"