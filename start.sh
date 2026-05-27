#!/bin/bash
# Minara — lokale Entwicklungsumgebung starten

set -e
cd "$(dirname "$0")"

echo "▶ AwqatSalah starten..."
docker start awqatsalah 2>/dev/null || docker-compose up -d

echo "▶ Supabase starten..."
supabase start

echo "▶ Fertig. URLs:"
echo "   App:      https://mosque.401dev.de"
echo "   API:      https://mosque-api.401dev.de"
echo "   Studio:   http://127.0.0.1:54344"
