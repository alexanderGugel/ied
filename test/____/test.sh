#!/bin/bash

packages=(
  "browserify"
  # "express"
  # "karma"
  # "bower"
  # "cordova"
  # "coffee-script"
  # "gulp"
  # "forever"
  # "grunt"
  # "less"
  # "tape"
)

#######################################
# Clear global ied_cache directory
# Globals:
#   HOME
# Arguments:
#   None
# Returns:
#   None
#######################################
clearCache ()
{
	echo "clearing cache"
  rm -rf $HOME/.ied_cache
  echo "cleared cache"
}

#######################################
# Create a dir and cd into it
# Globals:
#   None
# Arguments:
#   Dir
# Returns:
#   None
mkcdir ()
{
	mkdir -p "$1" && cd "$_"
}

#######################################
# Clear node_modules
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
#######################################
clearNodeModules () {
	echo "clearing node_modules"
	rm -rf node_modules
	echo "cleared node_modules"
}

installPackage ()
{
	echo "installing ${package}"
	mkcdir "sandbox/${package}"
	ied install ${package}
	echo "installed ${package}"
}

verifyInstallPackage ()
{
	echo "verifying ${package} install"
	node -e "require('assert')(require(\"${package}\"))"
	echo "verified ${package} install"
}

#######################################
# Test a package installation
# Globals:
#   None
# Arguments:
#   package
# Returns:
# 	None
#######################################
testPackage ()
{
  echo "testing ${package}"
  clearCache
  installPackage ${package}
  verifyInstallPackage ${package}
  echo "tested ${package}"
}

#######################################
# Run the test suite
# Globals:
#   None
# Arguments:
#   None
# Returns:
# 	None
#######################################
main ()
{
	for package in "${packages[@]}"
	do
	  testPackage $package
	done
}

main "$@"
