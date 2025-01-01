#include <cmath>
#include "battin1984.h"

double getTransferAngle(vec3d &r1, vec3d &r2, bool prograde)
{
    vec3d cross = r1.cross(r2);
    if (cross.isZero(tol))
    {
        return (r1.dot(r2) >= 0) ? 0 : M_PI;
    }

    vec3d h = cross.normalized();

    double alpha = vec3d(0, 0, 1).dot(h);
    double r1_norm = r1.norm();
    double r2_norm = r2.norm();

    double cosTheta = r1.dot(r2) / (r1_norm * r2_norm);
    cosTheta = std::clamp(cosTheta, -1.0, 1.0);
    double theta0 = std::acos(cosTheta);


    double dTheta;

    if (prograde)
    {
        dTheta = (alpha > 0) ? theta0 : (2 * M_PI - theta0);
    }
    else
    {
        dTheta = (alpha < 0) ? theta0 : (2 * M_PI - theta0);
    }

    return dTheta;
}

double getLambda(double c, double s, double dTheta)
{
    double lambda = sqrt(s * (s - c)) / s;
    lambda = dTheta < M_PI ? abs(lambda) : -abs(lambda);

    return lambda;
}

double getL1(double lambda)
{
    double l1 = ((1. - lambda) / std::pow(1. + lambda, 2.));
    return l1;
}

double getM(double mu, double tof, double s, double lambda)
{
    double m = (8. * mu * std::pow(tof, 2.)) / (std::pow(s, 3.) * std::pow(1. + lambda, 6.));
    return m;
}

double xiAtX(double x, int levels = 125)
{
    double eta = x / std::pow(sqrt(1. + x) + 1., 2.);
    double delta = 0., u = 1., sigma = 1., m1 = 1.;

    double gamma;

    while (u > 1e-18 && m1 <= levels)
    {
        m1 += 1;
        gamma = std::pow(m1 + 3., 2.) / (4. * std::pow(m1 + 3., 2.) - 1.);
        delta = 1. / (1. + gamma + eta + delta);
        u = u * (delta - 1.);
        sigma = sigma + u;
    }

    double xi = 8. * (sqrt(1. + x) + 1.) / (3. + 1. / (5. + eta + (9. * eta / 7.) * sigma));
    return xi;
}

std::tuple<double, double> getH(double x, double l1, double m)
{
    double xi = xiAtX(x);
    double hDenom = (1. + 2. * x + l1) * (4. * x + xi * (3. + x));

    double h1 = (std::pow(l1 + x, 2) * (1. + .3 * x + xi)) / hDenom;
    double h2 = (m * (x - l1 + xi)) / hDenom;

    return std::make_tuple(h1, h2);
}

double uAtB(double B)
{
    double u = -B / (2. * sqrt(1. + B) + 1.);
    return u;
}

double BAtH(double h1, double h2)
{
    double B = (27. * h2) / (4. + pow(1. + h1, 3.));
    return B;
}

double uAtH(double h1, double h2)
{
    double u = uAtB(BAtH(h1, h2));
    return u;
}

double KAtu(double u, int levels = 1000)
{
    double delta = 1, u0 = 1, sigma = 1, n1 = 0;

    while (std::abs(u0) > 1e-18 && n1 <= levels)
    {
        if (n1 == 0)
        {
            double gamma = 4. / 27.;
            delta = 1. / (1 - gamma * u * delta);
            u0 = u0 * (delta - 1.);
            sigma = sigma + u0;
        }
        else
        {
            for (int val: {1, 2})
            {
                double gamma;
                if (val == 1)
                {
                    gamma = (2.0
                             * (3. * n1 + 1)
                             * (6. * n1 - 1)
                             / (9.0 * (4 * n1 - 1) * (4 * n1 + 1)));
                }
                else
                {
                    gamma = (2.0
                             * (3. * n1 + 2)
                             * (6. * n1 + 1)
                             / (9.0 * (4 * n1 - 1) * (4 * n1 + 1)));
                }

                delta = 1.0 / (1.0 - gamma * u * delta);
                u0 = u0 * (delta - 1.0);
                sigma = sigma + u0;
            }
        }

        ++n1;
    }

    double K = std::pow(sigma / 3.0, 2);
    return K;
}

double battinFirstEq(double y, double l1, double m)
{
    double x = sqrt(pow((1. - l1) / 2., 2) + m / (y * y)) - (1. + l1) / 2.;
    return x;
}

double battinSecondEq(double u, double h1, double h2)
{
    double B = BAtH(h1, h2);
    double K = KAtu(u);

    double y = ((1. + h1) / 3.0) * (2. + std::sqrt(B + 1) / (1. - 2. * u * K));
    return y;
}


std::tuple<vec3d, vec3d> battin1984(double mu, vec3d &r1, vec3d &r2, double tof,
                                    bool prograde, int maxIter, double atol)
{
    double r1_norm = r1.norm();
    double r2_norm = r2.norm();
    double c_norm = (r2 - r1).norm();

    double semiperimeter = (r1_norm + r2_norm + c_norm) / 2;
    double dtheta = getTransferAngle(r1, r2, prograde);

    double lambda = getLambda(c_norm, semiperimeter, dtheta);

    double l1 = getL1(lambda);
    double m = getM(mu, tof, semiperimeter, lambda);

    double T = std::sqrt(8. * mu / std::pow(semiperimeter, 3) * tof);
    double Tp = (4. / 3.) * (1 - std::pow(lambda, 3));

    double x0 = (T > Tp) ? l1 : 0;

    double x, y;

    for (int i = 0; i < maxIter; ++i)
    {
        auto [h1, h2] = getH(x0, l1, m);

        double u = uAtH(h1, h2);
        y = battinSecondEq(u, h1, h2);
        x = battinFirstEq(y, l1, m);

        if (std::abs(x - x0) <= atol)
        {
            break;
        }
        else
            x0 = x;
    }

    double r11 = std::pow(1 + lambda, 2) / (4 * tof * lambda);
    double s11 = y * (1 + x);
    double t11 = (m * semiperimeter * std::pow(1 + lambda, 2)) / s11;

    vec3d v1 = -r11 * (s11 * (r1 - r2) - t11 * r1 / r1_norm);
    vec3d v2 = -r11 * (s11 * (r1 - r2) + t11 * r2 / r2_norm);

    auto ret = std::tuple<vec3d, vec3d>(v1, v2);
    return ret;
}

extern "C"
{
#ifdef EMSCRIPTEN
    EMSCRIPTEN_KEEPALIVE
#endif
    void battin1984_wrapper(double mu, double *r1, double *r2, double tof, bool prograde, double *result)
    {
        vec3d r1_vec(r1[0], r1[1], r1[2]);
        vec3d r2_vec(r2[0], r2[1], r2[2]);

        auto [v1, v2] = battin1984(mu, r1_vec, r2_vec, tof, prograde);

        result[0] = v1[0];
        result[1] = v1[1];
        result[2] = v1[2];
        result[3] = v2[0];
        result[4] = v2[1];
        result[5] = v2[2];
    }
}