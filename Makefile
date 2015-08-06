CURRENT_DIR = $(shell pwd)
INSTALL_DIR = /usr/local/lib/node_modules
BIN_DIR = /usr/local/bin
BIN = mpm

PHONY: install

# http://blog.jgc.org/2015/04/the-one-line-you-should-add-to-every.html
print-%: ; @echo $*=$($*)

preinstall:
	mkdir -p $(INSTALL_DIR); \
	mkdir -p $(BIN_DIR)

link: preinstall
	ln -s $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN); \
	ln -s $(INSTALL_DIR)/mpm/cmd.js $(BIN_DIR)/mpm

install: preinstall
	cp -R $(CURRENT_DIR) $(INSTALL_DIR)/$(BIN); \
	ln -s $(INSTALL_DIR)/mpm/cmd.js $(BIN_DIR)/mpm

uninstall:
	rm -rf $(INSTALL_DIR)/$(BIN); \
	rm $(BIN_DIR)/$(BIN)
