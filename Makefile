CURRENT_DIR = $(shell pwd)
INSTALL_DIR = /usr/local/lib/node_modules
BIN_DIR = /usr/local/bin
BIN = mpm

PHONY: install

# http://blog.jgc.org/2015/04/the-one-line-you-should-add-to-every.html
print-%: ; @echo $*=$($*)

unpack:
	rm -rf node_modules
	tar -xvf node_modules.tar node_modules

pack:
	rm -f node_modules.tar
	tar -cvf node_modules.tar node_modules

prepdirs:
	mkdir -p $(INSTALL_DIR)
	mkdir -p $(BIN_DIR)

link: prepdirs bootstrap
	ln -s $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/mpm/cmd.js $(BIN_DIR)/mpm

install: prepdirs bootstrap
	cp -R $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN)
	ln -s $(INSTALL_DIR)/mpm/cmd.js $(BIN_DIR)/mpm

uninstall:
	rm -rf $(INSTALL_DIR)/$(BIN)
	rm $(BIN_DIR)/$(BIN)

.bootstrap: unpack
	mkdir .bootstrap
	cp package.json .bootstrap/package.json
	cd .bootstrap; node ../cmd.js

bootstrap: clean .bootstrap
	rm -rf node_modules
	mv .bootstrap/node_modules node_modules
	rm -rf .bootstrap

clean:
	rm -rf .bootstrap