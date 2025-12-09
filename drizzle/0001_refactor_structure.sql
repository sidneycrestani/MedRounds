-- Renomeando e ajustando tipos (Dropando colunas antigas para limpar)
ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "content";
-- Se a coluna questions já existia como JSONB, vamos garantir que ela siga o novo formato, 
-- mas para este refactor, assumimos limpeza ou recriação se não houver dados importantes.
-- Caso tenha dados, seria necessário um script de migração de dados.

-- Vamos garantir a estrutura nova:
ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "questions"; -- Dropamos para recriar com tipagem limpa se necessário, ou apenas altere
ALTER TABLE "clinical_cases" ADD COLUMN "questions" jsonb;
ALTER TABLE "clinical_cases" ADD COLUMN "answers" text;

-- Exemplo de Insert para testar (Opcional)
-- INSERT INTO clinical_cases (title, description, questions, answers) 
-- VALUES (
--   'Caso de Sepse Neonatal', 
--   'Recém nascido com desconforto respiratório', 
--   '{"vignette": "RN de 38 semanas...", "question": "Qual a conduta imediata?"}', 
--   'A conduta é iniciar ampicilina e gentamicina...'
-- );