import { createWriteStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { mkdirp } from 'mkdirp'
import { rimraf } from 'rimraf'

import { getTableInfo } from '../database/getTableInfo.js'
import { toCamelCase } from '../helper/toCamelCase.js'
import { toUpperCamelCase } from '../helper/toUpperCamelCase.js'
import { ensureRecordSchema } from './ensureRecordSchema.js'
import { mergeNested } from './mergeNested.js'

export const generateSchemaForTable = async (name: string, tableInfo: string) => {
	const tableDefinition = tableInfo
	const isSchemaFull = !!tableDefinition?.toUpperCase().includes('SCHEMAFULL')

	const { fields } = await getTableInfo(name)

	let inputFields = mergeNested(fields, true, name)
	let outputFields = mergeNested(fields, false, name)

	if (!isSchemaFull) {
		inputFields += '.passthrough()'
		outputFields += '.passthrough()'
	}

	return {
		inputFields,
		outputFields,
	}
}

export const generateTableSchema = async (outFolder: string, tableInfo: Record<string, string>) => {
	await mkdirp(outFolder)

	const genSchemaFolder = resolve(outFolder, '_generated')

	console.log('Generating schema in', genSchemaFolder)

	await ensureRecordSchema(genSchemaFolder)

	for (const name in tableInfo) {
		// biome-ignore lint/style/noNonNullAssertion: During iteration over object, we know the key-value exist
		const { inputFields, outputFields } = await generateSchemaForTable(name, tableInfo[name]!)

		const tableName = toCamelCase(name)
		const tableSchemaFolder = resolve(genSchemaFolder, tableName)
		console.log(`👉 [${tableName}]: ${tableSchemaFolder}`)
		await rimraf(tableSchemaFolder)
		await mkdirp(tableSchemaFolder)

		const genSchemaFileName = resolve(tableSchemaFolder, `${toCamelCase(tableName)}SchemaGen.ts`)
		const genSchemaFile = createWriteStream(genSchemaFileName)

		const injectRecordSchema = inputFields.includes('recordId(') || outputFields.includes('recordId(')

		genSchemaFile.write(
			`// ====================
// DO NOT EDIT THIS FILE!
// This file is autogenerated and will be overwritten during generation!
// ====================

import { z } from "zod";
${injectRecordSchema ? 'import { recordId } from "../recordSchema.js"' : ''}

// the create schema for table ${name}
export ${inputFields};

// the select schema for table ${name}
export ${outputFields};

`,
		)

		genSchemaFile.close()
		console.log(` ✅ [${tableName}]: ${tableName}Schema.ts`)

		const schemaFolder = resolve(outFolder, 'schema', tableName)
		await mkdirp(schemaFolder)

		const schemaFileName = resolve(schemaFolder, `${toCamelCase(tableName)}Schema.ts`)

		if (!existsSync(schemaFileName)) {
			const sFile = createWriteStream(schemaFileName)
			sFile.write(`/* Place your custom changes here */

import { z } from "zod";

import { ${tableName}InputSchemaGen, ${tableName}OutputSchemaGen } from "../../_generated/${tableName}/${tableName}SchemaGen.js";

// payload schema for creating a new ${name} entity
export const ${tableName}CreateSchema = ${tableName}InputSchemaGen.merge(z.object({
  // add your custom fields here, which are not part of SurrealDB table schema
  // they are not overwritten by the next run
      }))

// payload schema for fetching a ${name} entity
export const ${tableName}Schema = ${tableName}OutputSchemaGen.merge(z.object({
  id: z.object({ tb: z.string(), id: z.string() }),
  // add your custom fields here, which are not part of SurrealDB table schema
  // they are not overwritten by the next run
      }))
`)
			sFile.close()
			console.log(` ✅ [${tableName}]: ${tableName}Schema.ts`)
		} else {
			console.log(` ❎ [${tableName}]: ${tableName}Schema.ts already exists`)
		}

		const typeFileName = resolve(schemaFolder, `${toCamelCase(tableName)}Types.ts`)

		if (!existsSync(typeFileName)) {
			const tFile = createWriteStream(typeFileName)
			tFile.write(`/* Place your custom changes here */

import { z } from "zod";
import { type RecordId} from "surrealdb.js";

import { ${tableName}CreateSchema, ${tableName}Schema } from "./${tableName}Schema.js";

// the create type for table ${name}
export type ${toUpperCamelCase(tableName)}Create = z.input<typeof ${tableName}CreateSchema>

// the select type for table ${name}
export type ${toUpperCamelCase(tableName)} = z.output<typeof ${tableName}Schema> & {id: RecordId<string>}
      `)
			tFile.close()
			console.log(` ✅ [${tableName}]: ${tableName}Types.ts`)
		} else {
			console.log(` ❎ [${tableName}]: ${tableName}Types.ts already exists`)
		}
	}
}
