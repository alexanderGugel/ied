# TODO Actually we could just use `npm link`, but we don't really want to rely
# on npm. Ideally we would even check-in the dependencies, but then people
# wouldn't take us seriously.

CURRENT_DIR = $(shell pwd)
INSTALL_DIR = $(HOME)/.node_modules
BIN_DIR = /usr/local/bin
BIN = ied
DEPS_BIN_DIR = ./node_modules/.bin
SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)

.PHONY: link install uninstall clean lint dev watch test

# http://blog.jgc.org/2015/04/the-one-line-you-should-add-to-every.html
print-%: ; @echo $*=$($*)

lib: $(LIB) node_modules
lib/%.js: src/%.js
	mkdir -p $(@D)
	$(DEPS_BIN_DIR)/babel $< -o $@

node_modules: package.json
	npm install

install_dirs:
	mkdir -p $(INSTALL_DIR)
	mkdir -p $(BIN_DIR)

link: install_dirs
	ln -s $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/ied/lib/cmd.js $(BIN_DIR)/ied

install: node_modules install_dirs
	cp -R $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	chmod +x $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/ied/lib/cmd.js $(BIN_DIR)/ied

uninstall:
	rm -rf $(INSTALL_DIR)/$(BIN) $(BIN_DIR)/$(BIN)

clean:
	rm -rf lib test/test

lint:
	npm run lint

docs: src
	$(DEPS_BIN_DIR)/esdoc -c esdoc.json

test:
	npm run test

dev:
	$(DEPS_BIN_DIR)/mocha --watch

watch:
	NODE_ENV=development $(DEPS_BIN_DIR)/babel -w src --out-dir lib -s inline
