import path from 'path'
import fs from 'fs'

export default function run () {
  fs.ReadStream(path.join(__dirname, '../USAGE.txt')).pipe(process.stdout)
}
