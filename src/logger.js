export function logResolved (parentShasum, shasum, name, version) {
  parentShasum = parentShasum || '       '
  console.log(`resolved ${parentShasum.substr(0, 7)} > ${shasum.substr(0, 7)} ${name}@${version}`)
}
