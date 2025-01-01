#include <iostream>
#include "battin1984.h"

int main()
{
    double mu_sun = 39.47692641;
    vec3d r1 = vec3d(0.159321004, 0.579266185, 0.052359607);
    vec3d r2 = vec3d(0.057594337, 0.605750797, 0.068345246);

    double tof = 0.010794065;

    auto [v1, v2] = battin1984(mu_sun, r1, r2, tof);

    std::cout << "Velocity Vector 1: " << v1.transpose() << "\n";
    std::cout << "Velocity Vector 2: " << v2.transpose() << std::endl;

    return 0;
}
