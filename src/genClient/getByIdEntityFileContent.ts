import { toUpperCamelCase } from '../helper/toUpperCamelCase.js'

export const getByIdEntityFileContent = (lib: string, entityName: string, outputSchemaFolderName: string) => {
	const entityNameFirstUpper = `${toUpperCamelCase(entityName)}`
	const entityTypeName = `${toUpperCamelCase(entityName)}`
	const entitySchemaName = `${entityName}Schema`

	return `
import { RecordId, type Surreal } from "${lib}";

import { ${entitySchemaName} } from "../../${outputSchemaFolderName}/${entityName}/${entityName}Schema.js";
import type { ${entityTypeName} } from "../../${outputSchemaFolderName}/${entityName}/${entityName}Types.js";

export const get${entityNameFirstUpper}ById = async function (db: Surreal, id: RecordId<string>) {
  const key = ${entitySchemaName}.pick({ id: true }).parse({ id });

  const result = await db.query<[${entityTypeName}|undefined]>("SELECT * FROM ONLY $id", { id });

  return result[0];
};
`
}
