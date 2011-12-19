
CLOSURE = java -jar  ./external/closure/closure-compiler-20111114.jar
CLOSURE_FLAGS= 

LICENSE=LICENSE
VERSION=0.1.0

BUILD_DIR=build

CORE=$(BUILD_DIR)/metaplayer.js
CSS=$(BUILD_DIR)/metaplayer.css

CORE_SRC=src/ramp.js src/models/*.js src/utils/*.js
CORE_MIN=$(CORE:.js=.min.js)

ALL_SERVICES=service.json service.smil 
ALL_PLAYERS=player.html5 player.flowplayer player.popcorn
ALL_UI=ui.controls ui.overlay ui.transcript
ALL_THEME=theme.mp2

compile=$(CLOSURE) $(CLOSURE_FLAGS) --js=$1 >  $2
license=cat $(LICENSE) $1 > $1.tmp; mv $1.tmp $1

all: clean $(CORE) $(CSS) $(ALL_SERVICES) $(ALL_PLAYERS) $(ALL_UI) $(ALL_THEME) $(CORE_MIN)
	@rm $(CSS)
	@@echo "Build complete. "

.PHONY : clean

test : 
	@echo $(BUILD_DIR) $(BUILD2_DIR)

$(CORE): $(BUILD_DIR)
	@@echo $@
	@cat $(CORE_SRC) > $@

$(CSS): $(BUILD_DIR) $(ALL_UI)
	@echo $@ 

service.%: $(BUILD_DIR)
	@echo $@ 
	@cat src/services/$*/*js >> $(CORE)

player.%: $(BUILD_DIR)
	@echo $@ 
	@cat src/players/$*/*js >> $(CORE)

ui.%: $(BUILD_DIR)
	@echo $@ 
	@cat src/ui/$*/*js >> $(BUILD_DIR)/metaplayer.$*.js
	@$(call compile,$(BUILD_DIR)/metaplayer.$*.js,$(BUILD_DIR)/metaplayer.$*.min.js)
	@$(call license,$(BUILD_DIR)/metaplayer.$*.js)
	@$(call license,$(BUILD_DIR)/metaplayer.$*.min.js)
	@cat src/ui/$*/*css >> $(CSS)
	@if test -d src/ui/$*/templates; then cp src/ui/$*/templates/*\.tmpl\.* $(BUILD_DIR)/templates; fi

theme.%: $(CSS)
	@echo $@ 
	@mkdir $(BUILD_DIR)/$*
	@cat $(CSS) > $(BUILD_DIR)/$*/theme.$*.css
	@cat src/themes/$*/*css >> $(BUILD_DIR)/$*/theme.$*.css 2>/dev/null
	@cp -r src/themes/$*/assets $(BUILD_DIR)/$*/ 2>/dev/null

%.min.js: %.js
	@echo $@ 
	@$(call compile,$<,$@)
	@$(call license,$@)

$(BUILD_DIR):
	@echo $@/
	@mkdir  $@
	@mkdir  $@/templates

clean: 
	@echo "Cleaning up previous builds..."
	@rm -rf $(BUILD_DIR);

