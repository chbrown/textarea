BIN := node_modules/.bin
TYPESCRIPT := $(shell jq -r '.files[]' tsconfig.json | grep -Fv .d.ts)
JAVASCRIPT := $(TYPESCRIPT_BASENAMES:%=%.js)

all: $(TYPESCRIPT:%.ts=%.js) $(TYPESCRIPT:%.ts=%.d.ts) .npmignore .gitignore

$(BIN)/tsc $(BIN)/_mocha $(BIN)/istanbul $(BIN)/coveralls:
	npm install

.npmignore: tsconfig.json
	echo $(TYPESCRIPT) Makefile tsconfig.json coverage/ tests/ | tr ' ' '\n' > $@

.gitignore: tsconfig.json
	echo $(TYPESCRIPT:%.ts=/%.js) $(TYPESCRIPT:%.ts=/%.d.ts) coverage/ | tr ' ' '\n' > $@

%.js %.d.ts: %.ts $(BIN)/tsc
	$(BIN)/tsc -d

test: $(TYPESCRIPT:%.ts=%.js) $(BIN)/istanbul $(BIN)/_mocha $(BIN)/coveralls
	$(BIN)/istanbul cover $(BIN)/_mocha -- --compilers js:babel-core/register tests/ -R spec
	cat coverage/lcov.info | $(BIN)/coveralls || true

clean:
	rm -f $(TYPESCRIPT:%.ts=%.js) $(TYPESCRIPT:%.ts=%.d.ts)
