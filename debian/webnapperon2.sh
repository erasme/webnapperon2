#!/bin/sh

# display TRACE on stdout
export MONO_TRACE_LISTENER=Console.Out

exec mono "/usr/lib/webnapperon2/Webnapperon2.exe" "$@"
