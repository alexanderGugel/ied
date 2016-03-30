# TODO Actually we could just use `npm link`, but we don't really want to rely
# on npm. Ideally we would even check-in the dependencies, but then people
# wouldn't take us seriously.

CURRENT_DIR = $(shell pwd)
INSTALL_DIR = $(HOME)/.node_modules
BIN_DIR = /usr/local/bin
BIN = ied
BOOTSTRAP_DIR = .bootstrap
DEPS_BIN_DIR = ./node_modules/.bin
SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)

.PHONY: install

# http://blog.jgc.org/2015/04/the-one-line-you-should-add-to-every.html
print-%: ; @echo $*=$($*)

lib: $(LIB)
lib/%.js: src/%.js
	@mkdir -p $(@D)
	@$(DEPS_BIN_DIR)/babel $< -o $@

node_modules: package.json
	rm -rf node_modules $(BOOTSTRAP_DIR)
	npm install
	mkdir $(BOOTSTRAP_DIR)
	cp package.json $(BOOTSTRAP_DIR)/package.json
	cd $(BOOTSTRAP_DIR); node ../bin/cmd.js i
	rm -rf node_modules
	mv $(BOOTSTRAP_DIR)/node_modules node_modules
	rm -rf $(BOOTSTRAP_DIR)

prepdirs:
	mkdir -p $(INSTALL_DIR)
	mkdir -p $(BIN_DIR)

preinstall: lib uninstall prepdirs node_modules

link: preinstall
	ln -s $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/ied/bin/cmd.js $(BIN_DIR)/ied

install: preinstall
	cp -R $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/ied/bin/cmd.js $(BIN_DIR)/ied

uninstall:
	rm -rf $(INSTALL_DIR)/$(BIN)
	rm -f $(BIN_DIR)/$(BIN)

clean:
	rm -rf $(BOOTSTRAP_DIR)

test:
	$(DEPS_BIN_DIR)/src/*-test.js --compilers js:babel-register --reporter min

dev:
	$(DEPS_BIN_DIR)/mocha src/*-test.js --compilers js:babel-register --reporter min --watch

watch:
	$(DEPS_BIN_DIR)/babel -w src --out-dir lib
