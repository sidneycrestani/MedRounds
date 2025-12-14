import { clinicalCases } from "@/modules/content/schema";
import { sql } from "drizzle-orm";
import {
	customType,
	foreignKey,
	index,
	integer,
	pgEnum,
	pgSchema,
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

const content = pgSchema("content");

const ltree = customType<{ data: string; driverData: string }>({
	dataType() {
		return "ltree";
	},
});

export const tags = content.table(
	"tags",
	{
		id: serial("id").primaryKey(),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		parentId: integer("parent_id"),
		path: ltree("path").notNull(),
		category: tagCategoryEnum("category").notNull(),
	},
	(table) => ({
		slugUnique: uniqueIndex("tags_slug_unique").on(table.slug),
		nameParentUnique: uniqueIndex("tags_parent_name_unique").on(
			table.parentId,
			table.name,
		),
		parentFk: foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "tags_parent_fk",
		}).onDelete("cascade"),
		pathGistIdx: index("tags_path_gist_idx").using("gist", sql`${table.path}`),
	}),
);

export const casesTags = content.table(
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
