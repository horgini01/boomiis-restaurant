#!/usr/bin/env node
import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://avnadmin:AVNS_feoioqUbDzzOY4bghVB@boomiis-mysql2026-bravehatconsulting.l.aivencloud.com:20815/defaultdb?ssl-mode=REQUIRED';

async function checkUsersTable() {
  let connection;
  try {
    const dbUrl = new URL(DATABASE_URL);
    const config = {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000
    };
    
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');
    
    console.log('Checking users table structure:\n');
    const [columns] = await connection.query('DESCRIBE users');
    
    console.log('Column Name                | Type                  | Null | Key | Default');
    console.log('---------------------------|----------------------|------|-----|----------');
    for (const col of columns) {
      const name = col.Field.padEnd(26);
      const type = col.Type.padEnd(20);
      const nullable = col.Null.padEnd(4);
      const key = col.Key.padEnd(3);
      const def = (col.Default || 'NULL').toString();
      console.log(`${name} | ${type} | ${nullable} | ${key} | ${def}`);
    }
    
    console.log('\n\nChecking for auth columns:');
    const authColumns = ['password_hash', 'otp_code', 'otp_expires', 'password_reset_token', 'password_reset_expires', 'is_setup_complete'];
    for (const colName of authColumns) {
      const exists = columns.some(c => c.Field === colName);
      console.log(`  ${exists ? '✅' : '❌'} ${colName}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsersTable();
