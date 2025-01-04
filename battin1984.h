#ifndef LAMBERT_BATTIN1984_H
#define LAMBERT_BATTIN1984_H

#include "external/eigen3/Eigen/Dense"
#include <tuple>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif

typedef Eigen::Vector3d vec3d;
constexpr double tol = 1e-10;

std::tuple<vec3d, vec3d> battin1984(double mu, vec3d &r1, vec3d &r2, double tof,
                                    bool prograde = true, int maxIter = 100, double atol = tol);

extern "C"
{

#ifdef EMSCRIPTEN
    EMSCRIPTEN_KEEPALIVE
#endif
    void battin1984_wrapper(double mu, const double r1[3], const double r2[3], double tof, bool prograde, double result[6]);
}

#endif //LAMBERT_BATTIN1984_H
