import { clinicalCases } from "@/modules/content/schema";
import {
	foreignKey,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const tagCategoryEnum = pgEnum("tag_category", [
	"specialty",
	"system",
	"pathology",
	"drug",
	"other",
]);

export const tags = pgTable(
	"tags",
	{
		id: serial("id").primaryKey(),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		parentId: integer("parent_id"),
		path: text("path"),
		category: tagCategoryEnum("category").notNull(),
	},
	(table) => ({
		slugUnique: uniqueIndex("tags_slug_unique").on(table.slug),
		nameParentUnique: uniqueIndex("tags_parent_name_unique").on(
			table.parentId,
			table.name,
		),
		pathUnique: uniqueIndex("tags_path_unique").on(table.path),
		parentFk: foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "tags_parent_fk",
		}).onDelete("set null"),
	}),
);

export const casesTags = pgTable(
	"cases_tags",
	{
		caseId: integer("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		tagId: integer("tag_id")
			.references(() => tags.id, { onDelete: "cascade" })
			.notNull(),
	},
	(table) => ({
		uq: uniqueIndex("cases_tags_case_tag_unique").on(table.caseId, table.tagId),
	}),
);
