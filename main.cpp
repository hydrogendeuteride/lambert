#include <iostream>
#include "battin1984.h"

int main()
{
    double mu_sun = 398600.0;
    vec3d r1 = vec3d(22592.145603, -1599.915239, -19783.950506);
    vec3d r2 = vec3d(1922.067697, 4054.157051, -8925.727465);

    double tof = 60.0 * 60.0 * 10.0;

    auto [v1, v2] = battin1984(mu_sun, r1, r2, tof);

    std::cout << "Velocity Vector 1: " << v1.transpose() << "\n";
    std::cout << "Velocity Vector 2: " << v2.transpose() << std::endl;

    return 0;
}
