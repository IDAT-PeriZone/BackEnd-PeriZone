/**
 * Automatiza lo que antes se hacía a mano con el cliente `mysql`:
 * lee la conexión desde .env y ejecuta database/schema.sql +
 * database/seed.sql contra ese servidor.
 *
 * schema.sql empieza con "DROP DATABASE IF EXISTS perizone" y la
 * vuelve a crear desde cero, así que correr este script SIEMPRE
 * borra y reemplaza los datos existentes de la base "perizone"
 * (no toca ninguna otra base de datos del servidor).
 *
 * Uso:
 *   npm run db:setup           -> pide confirmación antes de borrar
 *   npm run db:setup -- --yes  -> sin confirmación (útil en CI/scripts)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mysql, { Connection } from 'mysql2/promise';

const DATABASE_DIR = path.join(__dirname, '..', 'database');

async function confirmar(pregunta: string): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) return true;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await new Promise<string>((resolve) => rl.question(pregunta, resolve));
  rl.close();
  return /^s(i|í)?$/i.test(respuesta.trim());
}

async function ejecutarArchivoSql(conn: Connection, archivo: string): Promise<void> {
  const ruta = path.join(DATABASE_DIR, archivo);
  const sql = fs.readFileSync(ruta, 'utf-8');
  console.log(`→ ejecutando ${archivo}...`);
  await conn.query(sql);
  console.log(`✓ ${archivo} aplicado correctamente`);
}

async function main(): Promise<void> {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    console.error('Faltan variables DB_HOST, DB_USER o DB_NAME en tu .env');
    process.exit(1);
  }

  const ok = await confirmar(
    `Esto va a BORRAR y volver a crear la base de datos "${DB_NAME}" en ${DB_HOST} ` +
      `(los datos existentes en esa base se pierden; otras bases del servidor no se tocan).\n` +
      `¿Continuar? (s/N): `
  );
  if (!ok) {
    console.log('Cancelado, no se hizo ningún cambio.');
    return;
  }

  // Sin "database" en la conexión: schema.sql y seed.sql ya traen su
  // propio "USE perizone;", y la base todavía no existe en el primer run.
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await ejecutarArchivoSql(conn, 'schema.sql');
    await ejecutarArchivoSql(conn, 'seed.sql');
    console.log('\nBase de datos lista con datos de prueba.');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('Error ejecutando el setup de base de datos:', error);
  process.exit(1);
});
