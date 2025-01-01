cmake_minimum_required(VERSION 3.22)
project(lambert)

set(CMAKE_CXX_STANDARD 17)

set(CMAKE_CXX_FLAGS "-Wall -Wextra -ffloat-store -fno-fast-math")
set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "-O2 -march=native -mavx")

set(SOURCES
        main.cpp
        battin1984.cpp
)

if ("${CMAKE_SYSTEM_NAME}" STREQUAL "Emscripten")
    message(STATUS "Emscripten detected, configuring for WebAssembly.")

    execute_process(
            COMMAND ${CMAKE_COMMAND} -E echo_expand "${CMAKE_SOURCE_DIR}/../emsdk/upstream/emscripten"
            OUTPUT_VARIABLE EMSCRIPTEN_PATH
            OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    include_directories(${EMSCRIPTEN_PATH}/system/include)

    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s MODULARIZE=1 -s EXPORT_ES6=1 -s USE_ES6_IMPORT_META=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s ENVIRONMENT='web,node'")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -s WASM=1")

    add_executable(lambert ${SOURCES})

else()
    add_executable(lambert ${SOURCES})
endif()

target_include_directories(lambert PRIVATE ${EIGEN3_INCLUDE_DIR})
