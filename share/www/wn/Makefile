
all: compact

compact:
	grep '^Core.Util.include(appBase+' wn-debug.js | \
	sed "s/Core.Util.include(appBase+'\(.*\)');/\1/" | \
	xargs closure-compiler --compilation_level SIMPLE_OPTIMIZATIONS --js_output_file wn.js --js 

clean:
	
