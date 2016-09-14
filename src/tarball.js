

export const resolve = (nodeModules, parentTarget, name, version, options) =>
	match(name, version, options)::map(pkgJson => ({
		parentTarget,
		pkgJson,
		target: pkgJson.dist.shasum,
		name,
		fetch
	}))
