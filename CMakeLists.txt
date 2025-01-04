cmake_minimum_required(VERSION 3.22)
project(lambert)

set(CMAKE_CXX_STANDARD 17)

if(EMSCRIPTEN)
    message(STATUS "Emscripten detected. Configuring for WebAssembly.")
    set(CMAKE_CXX_COMPILER_ID "Emscripten")

    set(CMAKE_EXECUTABLE_SUFFIX ".html")
    set(EXPORTED_FUNCTIONS "-s EXPORTED_FUNCTIONS='[\"_battin1984_wrapper\", \"_malloc\", \"_free\"]'")
    set(EXPORTED_RUNTIME_METHODS "-s EXPORTED_RUNTIME_METHODS='[\"_malloc\", \"_free\", \"onRuntimeInitialized\"]'")
    set(MODULARIZE_FLAG "-s MODULARIZE=1")
    set(EXPORT_ES6_FLAG "-s EXPORT_ES6=1")
    set(ENVIRONMENT_FLAG "-s ENVIRONMENT=web")
    set(NO_ENTRY_FLAG "--no-entry")

    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EXPORTED_FUNCTIONS} ${EXPORTED_RUNTIME_METHODS} ${MODULARIZE_FLAG} ${EXPORT_ES6_FLAG} ${ENVIRONMENT_FLAG} ${NO_ENTRY_FLAG}")
else()
    message(STATUS "Native build detected.")
endif()

add_library(battin1984 SHARED battin1984.cpp)
add_executable(battin1984_exec battin1984.cpp)
add_executable(main main.cpp)

target_link_libraries(main PUBLIC battin1984)

target_include_directories(battin1984 PRIVATE ${EIGEN3_INCLUDE_DIR})
