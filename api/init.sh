#!/bin/bash

DB_HOST="postgres"
DB_PORT=${SPRING_DATASOURCE_PORT}
DB_USER=${SPRING_DATASOURCE_USERNAME}
DB_PASSWORD=${SPRING_DATASOURCE_PASSWORD}
DB_NAME=${SPRING_DATASOURCE_DB}
TABLE_NAME="mode_scale_chord_relation_view"

# wait for the largest materialized view to load (which comes last in flyway)
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "SELECT 1 FROM $TABLE_NAME LIMIT 1;" &> /dev/null
do
  echo "Waiting for Flyway migrations to be applied..."
  sleep 1
done

echo "Database is ready."

# now start the api
exec java -Xverify:none -jar /usr/src/app/api.jar