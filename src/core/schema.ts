import * as content from "@/modules/content/schema";
import * as srs from "@/modules/srs/schema";
import * as taxonomy from "@/modules/taxonomy/schema";

const schema = { ...content, ...taxonomy, ...srs };

export default schema;
export { content, taxonomy, srs };
