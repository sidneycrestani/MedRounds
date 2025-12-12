CREATE OR REPLACE FUNCTION resolve_tag_descendants(p_slug text)
RETURNS TABLE(id integer) AS $$
WITH RECURSIVE tag_tree AS (
  SELECT id, parent_id FROM tags WHERE slug = p_slug
  UNION ALL
  SELECT t.id, t.parent_id
  FROM tags t
  INNER JOIN tag_tree tt ON t.parent_id = tt.id
)
SELECT id FROM tag_tree;
$$ LANGUAGE sql STABLE;

CREATE INDEX IF NOT EXISTS user_case_state_next_review_idx ON user_case_state (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS user_case_history_recent_idx ON user_case_history (user_id, case_id, attempted_at DESC);

CREATE OR REPLACE FUNCTION select_next_case(p_user_id text, p_tag_slug text DEFAULT NULL)
RETURNS integer AS $$
WITH filtered_cases AS (
  SELECT c.id
  FROM clinical_cases c
  WHERE c.status = 'published'
    AND (
      p_tag_slug IS NULL OR EXISTS (
        SELECT 1
        FROM cases_tags ct
        JOIN resolve_tag_descendants(p_tag_slug) dt ON dt.id = ct.tag_id
        WHERE ct.case_id = c.id
      )
    )
), last_attempt AS (
  SELECT h.user_id, h.case_id, h.score, h.attempted_at,
         ROW_NUMBER() OVER (PARTITION BY h.user_id, h.case_id ORDER BY h.attempted_at DESC) AS rn
  FROM user_case_history h
  WHERE h.user_id = p_user_id
), ranked AS (
  SELECT fc.id AS case_id,
         ucs.next_review_at,
         la.score,
         la.attempted_at
  FROM filtered_cases fc
  LEFT JOIN user_case_state ucs
    ON ucs.case_id = fc.id AND ucs.user_id = p_user_id
  LEFT JOIN last_attempt la
    ON la.case_id = fc.id AND la.rn = 1
  WHERE NOT (
    la.score IS NOT NULL AND la.score >= 80 AND la.attempted_at >= now() - interval '15 minutes'
  )
)
SELECT r.case_id
FROM ranked r
ORDER BY
  CASE WHEN r.next_review_at IS NULL THEN 2 ELSE 1 END,
  r.next_review_at ASC NULLS LAST
LIMIT 1;
$$ LANGUAGE sql STABLE;

ALTER TABLE user_case_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_case_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_case_history_select ON user_case_history;
DROP POLICY IF EXISTS user_case_history_insert ON user_case_history;
DROP POLICY IF EXISTS user_case_history_update ON user_case_history;
DROP POLICY IF EXISTS user_case_history_delete ON user_case_history;

CREATE POLICY user_case_history_select ON user_case_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_case_history_insert ON user_case_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_case_history_update ON user_case_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_case_history_delete ON user_case_history
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_case_state_select ON user_case_state;
DROP POLICY IF EXISTS user_case_state_insert ON user_case_state;
DROP POLICY IF EXISTS user_case_state_update ON user_case_state;
DROP POLICY IF EXISTS user_case_state_delete ON user_case_state;

CREATE POLICY user_case_state_select ON user_case_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_case_state_insert ON user_case_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_case_state_update ON user_case_state
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_case_state_delete ON user_case_state
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS last_updated timestamptz NOT NULL DEFAULT now();
ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION clinical_cases_touch()
RETURNS trigger AS $$
BEGIN
  NEW.last_updated := now();
  NEW.version := COALESCE(NEW.version, 1) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinical_cases_touch_trigger ON clinical_cases;
CREATE TRIGGER clinical_cases_touch_trigger
BEFORE UPDATE ON clinical_cases
FOR EACH ROW
EXECUTE FUNCTION clinical_cases_touch();

