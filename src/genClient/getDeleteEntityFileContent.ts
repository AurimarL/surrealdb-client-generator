import { toUpperCamelCase } from '../helper/toUpperCamelCase.js'

export const getDeleteEntityFileContent = (lib: string, entityName: string, outputSchemaFolderName: string) => {
	const entityNameFirstUpper = `${toUpperCamelCase(entityName)}`
	const entityTypeName = `${toUpperCamelCase(entityName)}`

	return `
import { type Surreal, RecordId } from "${lib}";

import type { ${entityTypeName} } from "../../${outputSchemaFolderName}/${entityName}/${entityName}Types.js";

export const delete${entityNameFirstUpper} = async function (db: Surreal, id: RecordId) {
  return db.delete<${entityTypeName}>(id)
};
`
}
