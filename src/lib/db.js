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

// 创建全局单例连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10, // 根据服务器负载调整
  queueLimit: 0
});

export async function queryDb(query, params = []) {
  // pool.execute 自动获取并释放连接
  const [results] = await pool.execute(query, params);
  return results;
}

export async function queryDbBatch(queries) {
  // 使用连接池执行批量查询
  const results = [];
  for (const { query, params = [] } of queries) {
    const [result] = await pool.execute(query, params);
    results.push(result);
  }
  return results;
}