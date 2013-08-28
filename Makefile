
build: components index.js
	@component build --dev

components: component.json
	@component install --dev

clean:
	rm -fr build components

node_modules: package.json
	@npm install

test: build node_modules
	@./node_modules/.bin/mocha

testci: test

.PHONY: clean test testci
