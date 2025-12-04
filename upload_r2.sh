#!/bin/bash
# Script para fazer upload dos GIFs e manifest.json para o Cloudflare R2.

set -euo pipefail

# Nome do bucket R2 e prefixo dentro do bucket
BUCKET=${BUCKET:-"studio-ferraz-treinos"}
SOURCE_DIR=${SOURCE_DIR:-"public/gifs"}
DEST_PREFIX=${DEST_PREFIX:-"treino-gifs"}
MANIFEST_FILE=${MANIFEST_FILE:-"${SOURCE_DIR}/manifest.json"}

echo "Iniciando upload de '${SOURCE_DIR}' para o bucket: '${BUCKET}/${DEST_PREFIX}'"
echo "-------------------------------------------"

# Envia todos os GIFs mantendo a estrutura de pastas
find "${SOURCE_DIR}" -type f -not -name '.DS_Store' | while read -r FILE; do
  RELATIVE_PATH=$(echo "$FILE" | sed "s|^${SOURCE_DIR}/||")
  OBJECT_KEY="${DEST_PREFIX}/${RELATIVE_PATH}"
  MIME_TYPE=$(file -b --mime-type "$FILE" 2>/dev/null || echo "application/octet-stream")

  echo "Enviando ${FILE} -> r2://${BUCKET}/${OBJECT_KEY}"
  npx wrangler r2 object put "${BUCKET}/${OBJECT_KEY}" --file="${FILE}" --content-type="${MIME_TYPE}"
done

# Sobe o manifest.json com o content-type correto
if [ -f "${MANIFEST_FILE}" ]; then
  OBJECT_KEY="${DEST_PREFIX}/manifest.json"
  echo "Enviando manifest ${MANIFEST_FILE} -> r2://${BUCKET}/${OBJECT_KEY}"
  npx wrangler r2 object put "${BUCKET}/${OBJECT_KEY}" --file="${MANIFEST_FILE}" --content-type="application/json"
fi

echo "-------------------------------------------"
echo "Upload finalizado."
