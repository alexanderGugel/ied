CURRENT_DIR = $(shell pwd)
INSTALL_DIR = /usr/local/lib/node_modules
BIN_DIR = /usr/local/bin
BIN = mpm
BOOTSTRAP_DIR = .bootstrap
DEPS_BIN_DIR = ./node_modules/.bin

.PHONY: install

# http://blog.jgc.org/2015/04/the-one-line-you-should-add-to-every.html
print-%: ; @echo $*=$($*)

node_modules: package.json
	rm -rf node_modules $(BOOTSTRAP_DIR)
	npm install
	mkdir $(BOOTSTRAP_DIR)
	cp package.json $(BOOTSTRAP_DIR)/package.json
	cd $(BOOTSTRAP_DIR); node ../bin/cmd.js
	rm -rf node_modules
	mv $(BOOTSTRAP_DIR)/node_modules node_modules
	rm -rf $(BOOTSTRAP_DIR)

prepdirs:
	mkdir -p $(INSTALL_DIR)
	mkdir -p $(BIN_DIR)

# TODO Something is wrong here
# For some reason it creates a symlink to the binary within the cwd
link: prepdirs node_modules
	ln -s $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/mpm/bin/cmd.js $(BIN_DIR)/mpm

install: prepdirs node_modules
	cp -R $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/mpm/bin/cmd.js $(BIN_DIR)/mpm

uninstall:
	rm -rf $(INSTALL_DIR)/$(BIN)
	rm $(BIN_DIR)/$(BIN)

clean:
	rm -rf $(BOOTSTRAP_DIR)

test:
	mocha $(DEPS_BIN_DIR)/mocha

dev:
	mocha -w --reporter dot

cover:
	$(DEPS_BIN_DIR)/istanbul cover $(DEPS_BIN_DIR)/_mocha
