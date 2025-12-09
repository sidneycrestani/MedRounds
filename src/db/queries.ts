import { sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

type DB = PostgresJsDatabase | DrizzleD1Database

export async function fetchCaseIdsByTagSlug(db: DB, slug?: string): Promise<string[]> {
  if (!slug) {
    const res = await db.execute(sql`SELECT id FROM clinical_cases ORDER BY title ASC`)
    return (res.rows ?? res) as any as string[]
  }

  const res = await db.execute(sql`
    WITH RECURSIVE tag_tree AS (
      SELECT id, slug, name, parent_id FROM tags WHERE slug = ${slug}
      UNION ALL
      SELECT t.id, t.slug, t.name, t.parent_id
      FROM tags t
      INNER JOIN tag_tree tt ON t.parent_id = tt.id
    )
    SELECT c.id
    FROM clinical_cases c
    INNER JOIN cases_tags ct ON ct.case_id = c.id
    INNER JOIN tag_tree tt ON tt.id = ct.tag_id
    GROUP BY c.id
    ORDER BY MIN(c.title) ASC
  `)

  const rows = (res.rows ?? res) as any[]
  return rows.map((r: any) => r.id)
}

export async function fetchTagPathBySlug(db: DB, slug: string): Promise<{ id: string, slug: string, name: string }[]> {
  const res = await db.execute(sql`
    WITH RECURSIVE path AS (
      SELECT id, slug, name, parent_id, 0 as depth FROM tags WHERE slug = ${slug}
      UNION ALL
      SELECT t.id, t.slug, t.name, t.parent_id, p.depth + 1
      FROM tags t
      INNER JOIN path p ON p.parent_id = t.id
    )
    SELECT id, slug, name, depth FROM path ORDER BY depth DESC
  `)

  const rows = (res.rows ?? res) as any[]
  return rows.map((r: any) => ({ id: r.id, slug: r.slug, name: r.name }))
}
