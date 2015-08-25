CURRENT_DIR := $(shell pwd)
INSTALL_DIR := /usr/local/lib/node_modules
BIN_DIR := /usr/local/bin
BIN := mpm
BOOTSTRAP_DIR = .bootstrap

.PHONY: install

# http://blog.jgc.org/2015/04/the-one-line-you-should-add-to-every.html
print-%: ; @echo $*=$($*)

node_modules: package.json
	rm -rf node_modules $(BOOTSTRAP_DIR)
	tar -xvf node_modules.tar node_modules
	mkdir $(BOOTSTRAP_DIR)
	cp package.json $(BOOTSTRAP_DIR)/package.json
	cd $(BOOTSTRAP_DIR); node ../bin/cmd.js
	rm -rf node_modules
	mv $(BOOTSTRAP_DIR)/node_modules node_modules
	rm -rf $(BOOTSTRAP_DIR)

node_modules.tar: node_modules
	rm -f node_modules.tar
	tar -cvf node_modules.tar node_modules

prepdirs:
	mkdir -p $(INSTALL_DIR)
	mkdir -p $(BIN_DIR)

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
