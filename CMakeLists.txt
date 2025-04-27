cmake_minimum_required(VERSION 3.22)
project(lambert)

set(CMAKE_CXX_STANDARD 17)

include_directories(${CMAKE_SOURCE_DIR}/external/eigen3)

if (EMSCRIPTEN)
    message(STATUS "Emscripten: Using Embind with DYNAMIC_EXECUTION=0 for CSP compatibility")

    set(CMAKE_EXECUTABLE_SUFFIX ".js")

    set(EM_FLAGS
            "-s MODULARIZE=1"
            "-s EXPORT_ES6=1"
            "-s EXPORT_NAME='createModule'"
            "-s ENVIRONMENT='web'"
            "--no-entry"
            "-s SINGLE_FILE=1"
            "-msimd128"
            "-s WASM_BIGINT=1"
            "-O3"
            "--bind"
            "-s DYNAMIC_EXECUTION=0"
            "-s ALLOW_TABLE_GROWTH=1"
            "-s EXPORTED_RUNTIME_METHODS=['onRuntimeInitialized']"
            "-s INITIAL_MEMORY=128MB -s ALLOW_MEMORY_GROWTH=0"
    )

    string (REPLACE ";" " " EM_FLAGS_STR "${EM_FLAGS}")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EM_FLAGS_STR}")

    message(STATUS "CMAKE_CXX_FLAGS = ${CMAKE_CXX_FLAGS}")
else ()
    message(STATUS "Native build detected.")
endif ()

add_library(battin1984 SHARED src/cpp/battin1984.cpp)
add_executable(battin1984_exec src/cpp/battin1984.cpp)
add_executable(main src/cpp/main.cpp)

target_link_libraries(main PUBLIC battin1984)

target_include_directories(battin1984 PRIVATE ${EIGEN3_INCLUDE_DIR})