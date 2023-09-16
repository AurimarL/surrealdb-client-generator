#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { program } from 'commander'

import { configFileSchema } from './config/configFileSchema.js'
import { closeDb, connectDb, insertDefinitions } from './database/db.js'
import { generateClient } from './genClient/generateClient.js'
import { generateTableSchema } from './genSchema/generateTableSchema.js'
import { printSorry } from './helper/printSorry.js'

const main = async () => {
  program
    .name('surql-gen')
    .description('Generate zod schema and typescript client code from running Surreal database')
    .version('1.0.0')

  program
    .option('-f, --file [schemaFile]', 'a SurrealQL file containing the definitions', 'myschema.surql')
    .option('-c, --config [configFile]', 'SurrealDB connection url', 'surql-gen.json')
    .option('-s, --surreal [surreal]', 'SurrealDB connection url', 'ws://127.0.0.1:8000')
    .option('-u, --username [username]', 'auth username', 'root')
    .option('-p, --password [password]', 'auth password', 'root')
    .option('-n, --ns [ns]', 'the namspace', 'test')
    .option('-d, --db [db]', 'the database', 'test')
    .option('-o, --outputFolder [outputFolder]', 'output folder', 'client_generated')
    .option('-g, --generateClient [generateClient]', 'generate client', true)

  program.parse()

  const options = program.opts()
  const __dirname = process.cwd()

  if (!options.configFile) {
    console.log('No config file provided - looking for surql-gen.json in current folder')
  }

  const configFilePath = resolve(__dirname, options.configFile || 'surql-gen.json')

  let fileContent: Record<string, unknown> = {}
  try {
    const content = await readFile(configFilePath)
    fileContent = JSON.parse(content.toString())
  } catch (error) {
    const err = error as any
    if (err.code === 'ENOENT') {
      console.log('No config file found.')
    } else {
      console.error('')
      console.error('Please have a look at your config file!')
      console.error('Looks like, your configuration file is invalid.')
      console.error('')
      throw new Error('Invalid configuration: ' + err.message)
    }
  }

  const config = configFileSchema.parse({ ...fileContent, ...options })

  await connectDb(config)

  if (config.schemaFile) {
    const schemaFilePath = resolve(__dirname, config.schemaFile)
    let surQLContent: Buffer
    try {
      surQLContent = await readFile(schemaFilePath)
    } catch (error) {
      const err = error as any
      if (err.code === 'ENOENT') {
        console.error('')
        console.error('Unable to find schema file', schemaFilePath)
        console.error('Please check!')
        console.error('')
        process.exit(1)
      } else {
        console.error('')
        console.error('Please have a look at your config file!')
        console.error('Looks like, your configuration file is invalid.')
        console.error('')
        throw new Error('Invalid configuration: ' + err.message)
      }
    }

    try {
      await insertDefinitions(surQLContent.toString())
    } catch (error) {
      printSorry(error)
      process.exit(1)
    }
  }

  try {
    await generateTableSchema(resolve(__dirname, config.outputFolder))

    if (config.generateClient) {
      await generateClient(resolve(__dirname, config.outputFolder))
    }
  } catch (error) {
    printSorry(error)
    process.exit(1)
  }

  await closeDb()

  console.log('')
  console.log('')
  console.log('Thanks for using my tool')
  console.log('')
  console.log('Please 🙏 give a star ⭐️ on github: 👉 https://github.com/sebastianwessel/surrealdb-client-generator')
  console.log('')
  console.log('If you run into an issue, please let me know so it can get fixed.')
  console.log('👉 https://github.com/sebastianwessel/surrealdb-client-generator/issues')
  console.log('')
  console.log('Good luck with your project. 👋 Cheers, and happy coding!')
  console.log('')
}

main()
