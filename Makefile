
build: components index.js
	@component build --dev

components: component.json
	@component install --dev

clean:
	rm -fr build components

node_modules: package.json
	@npm install

lintfiles := *.js *.json lib test

test: lint test-only

lint: node_modules
	@./node_modules/.bin/jshint --verbose --extra-ext .js,.json $(lintfiles)

test-only: build node_modules
	@./node_modules/.bin/mocha

testci: test

.PHONY: clean test testci lint test-only
