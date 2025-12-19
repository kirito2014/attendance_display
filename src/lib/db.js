import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '.env.local' });

const dbConfig = {
  host: process.env.NEXT_SECRET_DB_HOST,
  user: process.env.NEXT_SECRET_DB_USER,
  password: process.env.NEXT_SECRET_DB_PASSWORD,
  database: process.env.NEXT_SECRET_DB_NAME,
  port: parseInt(process.env.NEXT_SECRET_DB_PORT || '3306'),
};

export async function queryDb(query, params = []) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    await connection.end();
  }
}

export async function queryDbBatch(queries) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const results = [];
    for (const { query, params = [] } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    return results;
  } finally {
    await connection.end();
  }
}