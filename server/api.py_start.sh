#!/bin/bash
cd $(dirname $0)/..
echo "Starting Python API..."
python -m uvicorn server.api:app --host 0.0.0.0 --port 8000
