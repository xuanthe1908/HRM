import mysql, { type Pool } from 'mysql2/promise'

let pool: Pool | null = null

function getRequiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export function getMysqlPool(): Pool {
  if (pool) return pool

  const host = getRequiredEnv('MYSQL_HOST')
  const user = getRequiredEnv('MYSQL_USER')
  const password = process.env.MYSQL_PASSWORD || ''
  const database = process.env.MYSQL_DATABASE || 'attendance_db'
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306

  pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
  })

  return pool
}

export function getAttendanceTableName(): string {
  return process.env.MYSQL_ATTENDANCE_TABLE || 'attendance'
}


