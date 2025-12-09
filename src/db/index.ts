import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const connectionString = (import.meta.env.DATABASE_URL || process.env.DATABASE_URL) as string
if (!connectionString) throw new Error('DATABASE_URL not found')
const client = postgres(connectionString, { max: 1, prepare: false })
export const db = drizzle(client)
