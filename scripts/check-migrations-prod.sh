#!/usr/bin/env bash
# check-migrations-prod.sh
# Cruza migraciones locales contra lo aplicado en Supabase producción (y dev, como referencia).
# Exit 0 → todo sincronizado. Exit 1 → hay migraciones pendientes en prod.
#
# Uso:  ./scripts/check-migrations-prod.sh
# NPM:  npm run check:migrations  (desde medhistorial/)
#
# Requiere: SUPABASE_ACCESS_TOKEN en .env.local (o en el entorno).
# Este script SOLO LEE — nunca ejecuta migraciones.

set -uo pipefail

# ─── Colores ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Project refs ────────────────────────────────────────────────────────────
PROD_REF="mtsgzkhdochfgwdipctj"
DEV_REF="jsxvbikivohbrrjnxagx"
API_BASE="https://api.supabase.com/v1/projects"

# ─── Cargar .env.local si existe ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [[ -f "$ENV_FILE" ]]; then
  TOKEN_LINE=$(grep -E '^SUPABASE_ACCESS_TOKEN=' "$ENV_FILE" 2>/dev/null || true)
  if [[ -n "$TOKEN_LINE" ]]; then
    export "${TOKEN_LINE?}"
  fi
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo -e "${RED}Error:${RESET} SUPABASE_ACCESS_TOKEN no encontrado."
  echo "  Agrega SUPABASE_ACCESS_TOKEN=<tu_pat> en medhistorial/.env.local"
  exit 1
fi

# ─── Función: obtener versiones aplicadas en un proyecto ─────────────────────
# Supabase guarda la versión como el prefijo numérico: "001", "002", etc.
# Devuelve una línea por versión, ordenadas.
get_applied_versions() {
  local ref="$1"
  local label="$2"

  # curl -w imprime el cuerpo y luego el código HTTP en la última línea
  local full_response
  full_response=$(curl -s -w "\n__HTTP_CODE__%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"}' \
    "$API_BASE/$ref/database/query" 2>/dev/null)

  local http_code
  http_code=$(echo "$full_response" | grep '__HTTP_CODE__' | sed 's/__HTTP_CODE__//')
  local body
  body=$(echo "$full_response" | grep -v '__HTTP_CODE__')

  # Aceptar cualquier código 2xx
  if [[ ! "$http_code" =~ ^2 ]]; then
    echo -e "${RED}Error al conectar con $label (HTTP $http_code).${RESET}" >&2
    echo -e "  Respuesta: $body" >&2
    return 1
  fi

  # Extraer valores de version del JSON: [{"version":"001"},{"version":"002"},...]
  # Usando solo herramientas POSIX: grep + sed
  echo "$body" \
    | grep -oE '"version":"[^"]+"' \
    | sed 's/"version":"//;s/"//' \
    | sort
}

# ─── Función: listar prefijos numéricos de migraciones locales ───────────────
# Los archivos se llaman NNN_nombre.sql — Supabase solo guarda el prefijo NNN.
# Excluye seeds sin prefijo numérico (seed_*.sql).
get_local_versions() {
  local migrations_dir="$SCRIPT_DIR/../supabase/migrations"

  if [[ ! -d "$migrations_dir" ]]; then
    echo -e "${RED}Error:${RESET} No se encontró $migrations_dir" >&2
    return 1
  fi

  find "$migrations_dir" -maxdepth 1 -name "*.sql" -type f \
    | xargs -I{} basename {} .sql \
    | grep -E '^[0-9]' \
    | sed 's/^\([0-9]*\).*/\1/' \
    | sort -n \
    | while read -r num; do
        # Normalizar a 3 dígitos mínimos para que coincida con Supabase
        printf "%03d\n" "$((10#$num))"
      done \
    | sort -u
}

# ─── Función: calcular diff ───────────────────────────────────────────────────
# Líneas en $1 que NO están en $2
compute_diff() {
  comm -23 \
    <(echo "$1" | sort) \
    <(echo "$2" | sort)
}

# ─── Main ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Praxis — Verificador de migraciones${RESET}"
echo -e "Fecha: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "────────────────────────────────────────────────────────"

# 1. Migraciones locales
echo -e "\n${CYAN}[LOCAL] Leyendo supabase/migrations/...${RESET}"
LOCAL_VERSIONS=$(get_local_versions)
LOCAL_COUNT=$(echo "$LOCAL_VERSIONS" | grep -c . 2>/dev/null || echo 0)
echo -e "  ${BOLD}$LOCAL_COUNT${RESET} migraciones locales con prefijo numérico"

# 2. Aplicadas en PRODUCCION (bloqueante)
echo -e "\n${CYAN}[PROD]  Consultando $PROD_REF...${RESET}"
PROD_VERSIONS=$(get_applied_versions "$PROD_REF" "Producción") || {
  echo -e "${RED}No se pudo consultar producción. Abortando.${RESET}"
  exit 1
}
PROD_COUNT=$(echo "$PROD_VERSIONS" | grep -c . 2>/dev/null || echo 0)
echo -e "  ${BOLD}$PROD_COUNT${RESET} migraciones aplicadas en producción"

# 3. Aplicadas en DEV (solo referencia, no bloqueante)
echo -e "\n${CYAN}[DEV]   Consultando $DEV_REF...${RESET}"
DEV_VERSIONS=$(get_applied_versions "$DEV_REF" "Dev") || {
  echo -e "${YELLOW}  No se pudo consultar dev (no bloqueante).${RESET}"
  DEV_VERSIONS=""
}
if [[ -n "$DEV_VERSIONS" ]]; then
  DEV_COUNT=$(echo "$DEV_VERSIONS" | grep -c . 2>/dev/null || echo 0)
  echo -e "  ${BOLD}$DEV_COUNT${RESET} migraciones aplicadas en dev"
fi

# 4. Diff PROD (determina el exit code)
echo ""
echo "────────────────────────────────────────────────────────"
MISSING_IN_PROD=$(compute_diff "$LOCAL_VERSIONS" "$PROD_VERSIONS")

PROD_OK=0
if [[ -z "$MISSING_IN_PROD" ]]; then
  echo -e "${GREEN}PROD sincronizada.${RESET} Todas las migraciones locales estan en produccion."
else
  PROD_OK=1
  echo -e "${RED}PROD DESINCRONIZADA.${RESET} Migraciones locales ausentes en produccion:"
  MIGRATIONS_DIR="$SCRIPT_DIR/../supabase/migrations"
  while IFS= read -r version; do
    # Puede haber prefijos duplicados (ej: 042_add_onboarding + 042_citas_slot_unico)
    MATCHES=()
    while IFS= read -r match; do
      [[ -n "$match" ]] && MATCHES+=("$match")
    done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "${version}*.sql" -type f \
      | xargs -I{} basename {} 2>/dev/null | sort)
    if [[ ${#MATCHES[@]} -eq 0 ]]; then
      echo -e "  ${RED}FALTA${RESET}  $version (archivo no encontrado localmente)"
    elif [[ ${#MATCHES[@]} -gt 1 ]]; then
      for match in "${MATCHES[@]}"; do
        echo -e "  ${RED}FALTA${RESET}  $match ${YELLOW}[prefijo 042 duplicado — verificar]${RESET}"
      done
    else
      echo -e "  ${RED}FALTA${RESET}  ${MATCHES[0]}"
    fi
  done <<< "$MISSING_IN_PROD"
fi

# 5. Diff DEV (solo informativo)
if [[ -n "$DEV_VERSIONS" ]]; then
  MISSING_IN_DEV=$(compute_diff "$LOCAL_VERSIONS" "$DEV_VERSIONS")
  echo ""
  if [[ -z "$MISSING_IN_DEV" ]]; then
    echo -e "${GREEN}DEV sincronizado.${RESET} (referencia, no bloqueante)"
  else
    echo -e "${YELLOW}DEV desincronizado${RESET} (referencia, no bloqueante):"
    MIGRATIONS_DIR="$SCRIPT_DIR/../supabase/migrations"
    while IFS= read -r version; do
      DEV_MATCHES=()
      while IFS= read -r match; do
        [[ -n "$match" ]] && DEV_MATCHES+=("$match")
      done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "${version}*.sql" -type f \
        | xargs -I{} basename {} 2>/dev/null | sort)
      if [[ ${#DEV_MATCHES[@]} -eq 0 ]]; then
        echo -e "  ${YELLOW}FALTA${RESET}  $version"
      else
        for match in "${DEV_MATCHES[@]}"; do
          echo -e "  ${YELLOW}FALTA${RESET}  $match"
        done
      fi
    done <<< "$MISSING_IN_DEV"
  fi
fi

# 6. Veredicto final
echo ""
echo "────────────────────────────────────────────────────────"
if [[ $PROD_OK -eq 0 ]]; then
  echo -e "${GREEN}RESULTADO: OK — seguro hacer deploy.${RESET}"
else
  MISSING_COUNT=$(echo "$MISSING_IN_PROD" | grep -c . 2>/dev/null || echo 0)
  echo -e "${RED}RESULTADO: BLOQUEAR DEPLOY — $MISSING_COUNT migración(es) pendiente(s) en prod.${RESET}"
  echo -e "  Ejecuta las migraciones faltantes en prod via Supabase Management API antes del push."
fi
echo ""

exit $PROD_OK
