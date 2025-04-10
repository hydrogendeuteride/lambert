#ifndef LAMBERT_BATTIN1984_H
#define LAMBERT_BATTIN1984_H

#include "external/eigen3/Eigen/Dense"
#include <tuple>
#include <chrono>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif

typedef Eigen::Vector3d vec3d;
constexpr double tol = 1e-10;

constexpr double MIN_TOF = 3600.0;
constexpr double MAX_TOF = 86400.0 * 365 * 20;
constexpr double MAX_DV_CUTOFF = 50.0;
constexpr double MAX_C3_CUTOFF = 250.0;
constexpr double INVALID_MARKER = -1.0;

std::tuple<vec3d, vec3d> battin1984(double mu, vec3d &r1, vec3d &r2, double tof,
                                    bool prograde = true, bool shortPath = true, int maxIter = 100, double atol = tol, int nRev = 0);

extern "C"
{

#ifdef EMSCRIPTEN
EMSCRIPTEN_KEEPALIVE
#endif
void battin1984_wrapper(double mu, const double r1[3], const double r2[3], double tof, bool prograde, double result[6]);
}

#endif //LAMBERT_BATTIN1984_H
