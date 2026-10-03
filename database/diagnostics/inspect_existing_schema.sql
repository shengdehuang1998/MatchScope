-- 只读检查脚本：不会创建、修改或删除任何数据库对象或数据。

SELECT
  current_database() AS database_name,
  current_schema() AS current_schema,
  current_user AS database_user,
  version() AS postgres_version;

SELECT
  n.nspname AS schema_name,
  c.relname AS object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    WHEN 'S' THEN 'sequence'
    ELSE c.relkind::text
  END AS object_type,
  obj_description(c.oid, 'pg_class') AS object_comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = current_schema()
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
ORDER BY object_type, object_name;

SELECT
  cols.table_schema,
  cols.table_name,
  cols.ordinal_position,
  cols.column_name,
  cols.data_type,
  cols.udt_name,
  cols.is_nullable,
  cols.column_default,
  col_description(cls.oid, cols.ordinal_position) AS column_comment
FROM information_schema.columns cols
JOIN pg_namespace ns ON ns.nspname = cols.table_schema
JOIN pg_class cls
  ON cls.relnamespace = ns.oid
 AND cls.relname = cols.table_name
WHERE cols.table_schema = current_schema()
ORDER BY cols.table_name, cols.ordinal_position;

SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'x' THEN 'EXCLUDE'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = current_schema()
ORDER BY c.relname, con.conname;

SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  indexname AS index_name,
  indexdef AS definition
FROM pg_indexes
WHERE schemaname = current_schema()
ORDER BY tablename, indexname;
