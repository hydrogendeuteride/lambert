#include <cmath>
#include "battin1984.h"
#include <iostream>
#include <vector>

#ifdef EMSCRIPTEN

#include <wasm_simd128.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

#endif

double getTransferAngle(vec3d &r1, vec3d &r2, bool prograde, bool shortPath)
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

    if (shortPath)
    {
        if (dTheta > M_PI)
            dTheta = 2 * M_PI - dTheta;
    }
    else
    {
        if (dTheta < M_PI)
            dTheta = 2 * M_PI - dTheta;
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
    double l1 = std::pow((1. - lambda) / (1. + lambda), 2.);
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
        delta = 1. / (1. + gamma * eta * delta);
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
                                    bool prograde, bool shortPath, int maxIter, double atol, int nRev)
{
    double r1_norm = r1.norm();
    double r2_norm = r2.norm();
    double c_norm = (r2 - r1).norm();

    double semiperimeter = (r1_norm + r2_norm + c_norm) / 2.0;
    double dtheta = getTransferAngle(r1, r2, prograde, shortPath);
    if (nRev > 0)
    {
        dtheta += 2 * M_PI * nRev;
    }

    double lambda = getLambda(c_norm, semiperimeter, dtheta);

    double l1 = getL1(lambda);
    double m = getM(mu, tof, semiperimeter, lambda);

    double T = std::sqrt(8. * mu / std::pow(semiperimeter, 3)) * tof;
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

double julianDateToSeconds(double julianDate)
{
    const double SECONDS_PER_DAY = 86400.0;
    return (julianDate - 2451545.0) * SECONDS_PER_DAY;
}

#ifdef EMSCRIPTEN

v128_t julianDateToSeconds_simd(v128_t julianDates)
{
    const double JULIAN_EPOCH = 2451545.0;
    const double SECONDS_PER_DAY = 86400.0;

    v128_t epoch = wasm_f64x2_splat(JULIAN_EPOCH);
    v128_t secondsPerDay = wasm_f64x2_splat(SECONDS_PER_DAY);

    // (julianDates - epoch) * secondsPerDay
    v128_t delta = wasm_f64x2_sub(julianDates, epoch);
    v128_t result = wasm_f64x2_mul(delta, secondsPerDay);

    return result;
}

#endif

#ifdef EMSCRIPTEN

EMSCRIPTEN_KEEPALIVE
#endif
void battin1984_wrapper(double mu, const double r1[3], const double r2[3], double tof, bool prograde, double result[6])
{
    std::cout << "Input r1: " << r1[0] << ", " << r1[1] << ", " << r1[2] << std::endl;
    std::cout << "Input r2: " << r2[0] << ", " << r2[1] << ", " << r2[2] << std::endl;

    vec3d r1_vec = {r1[0], r1[1], r1[2]};
    vec3d r2_vec = {r2[0], r2[1], r2[2]};

    auto [v1, v2] = battin1984(mu, r1_vec, r2_vec, tof, prograde);

    std::cout << "Result v1: " << v1[0] << ", " << v1[1] << ", " << v1[2] << std::endl;
    std::cout << "Result v2: " << v2[0] << ", " << v2[1] << ", " << v2[2] << std::endl;

    result[0] = v1[0];
    result[1] = v1[1];
    result[2] = v1[2];
    result[3] = v2[0];
    result[4] = v2[1];
    result[5] = v2[2];
}

#ifdef EMSCRPTEN
EMSCRIPTEN_KEEPALIVE
#endif

void computePorkchopPlot(
        double mu,
        const double *r1,
        const double *v1,
        const double *r2,
        const double *v2,
        const double *d1,
        const double *d2,
        int num_departure_dates,
        int num_arrival_dates,
        double departure_planet_mu,
        double arrival_planet_mu,
        double departure_orbit_radius,
        double arrival_orbit_radius,
        double *result_c3,
        double *result_dv1,
        double *result_total_dv
)
{
    bool prograde = true;

    for (int i = 0; i < num_departure_dates; ++i)
    {
        double departure_time = julianDateToSeconds(d1[i]);
        vec3d r1_departure = {r1[i * 3], r1[i * 3 + 1], r1[i * 3 + 2]};
        vec3d v1_departure = {v1[i * 3], v1[i * 3 + 1], v1[i * 3 + 2]};

        for (int j = 0; j < num_arrival_dates; ++j)
        {
            double arrival_time = julianDateToSeconds(d2[j]);
            vec3d r2_arrival = {r2[j * 3], r2[j * 3 + 1], r2[j * 3 + 2]};
            vec3d v2_arrival = {v2[j * 3], v2[j * 3 + 1], v2[j * 3 + 2]};

            int index = i * num_arrival_dates + j;

            result_c3[index] = INVALID_MARKER;
            result_dv1[index] = INVALID_MARKER;
            result_total_dv[index] = INVALID_MARKER;

            double tof = arrival_time - departure_time;

            if (arrival_time <= departure_time || tof < MIN_TOF)
            {
                result_c3[index] = MAX_C3_CUTOFF;
                result_dv1[index] = MAX_DV_CUTOFF;
                result_total_dv[index] = MAX_DV_CUTOFF;
                continue;
            }

            if (tof < 86400.0)
                continue;


            double best_total_dv = std::numeric_limits<double>::infinity();
            double best_dv1 = MAX_DV_CUTOFF;
            double best_c3 = MAX_C3_CUTOFF;

            for (bool shortPath: {true, false})
            {
                auto [v1_transfer, v2_transfer] =
                        battin1984(mu, r1_departure, r2_arrival, tof, prograde, shortPath);

                vec3d v_inf_departure = v1_transfer - v1_departure;
                vec3d v_inf_arrival = v2_arrival - v2_transfer;

                double c3_departure = std::pow(v_inf_departure.norm(), 2);
                double c3_clamped = std::min(c3_departure, MAX_C3_CUTOFF);

                double v_orbit_dep = std::sqrt(departure_planet_mu / departure_orbit_radius);
                double dv1 = std::sqrt(2 * v_orbit_dep * v_orbit_dep + c3_clamped) - v_orbit_dep;

                double c3_arrival = std::pow(v_inf_arrival.norm(), 2);
                double v_orbit_arr = std::sqrt(arrival_planet_mu / arrival_orbit_radius);
                double dv2 = std::sqrt(2 * v_orbit_arr * v_orbit_arr + c3_arrival) - v_orbit_arr;

                double total_dv = dv1 + dv2;

                if (total_dv < best_total_dv)
                {
                    best_total_dv = total_dv;
                    best_dv1 = dv1;
                    best_c3 = c3_clamped;
                }
            }

            result_c3[index] = std::min(best_c3, MAX_C3_CUTOFF);
            result_dv1[index] = std::min(best_dv1, MAX_DV_CUTOFF);
            result_total_dv[index] = std::min(best_total_dv, MAX_DV_CUTOFF);

        }
    }
}

#ifdef EMSCRPTEN
EMSCRIPTEN_KEEPALIVE
#endif

void computePorkchopPlot_SIMD(
        double mu,
        const std::vector<double> &r1,
        const std::vector<double> &v1,
        const std::vector<double> &r2,
        const std::vector<double> &v2,
        const std::vector<double> &d1,
        const std::vector<double> &d2,
        int num_departure_dates,
        int num_arrival_dates,
        double departure_planet_mu,
        double arrival_planet_mu,
        double departure_orbit_radius,
        double arrival_orbit_radius,
        std::vector<double> &result_c3,
        std::vector<double> &result_dv1,
        std::vector<double> &result_total_dv
)
{
    bool prograde = true;

    const v128_t v_max_c3_cutoff = wasm_f64x2_splat(MAX_DV_CUTOFF);
    const v128_t v_max_dv_cutoff = wasm_f64x2_splat(MAX_DV_CUTOFF);
    const v128_t v_min_tof = wasm_f64x2_splat(MIN_TOF);
    const v128_t v_zero = wasm_f64x2_splat(0.0);
    const v128_t v_two = wasm_f64x2_splat(2.0);
    const v128_t v_inf = wasm_f64x2_splat(std::numeric_limits<double>::infinity());

    const double v_orbit_dep_sq = departure_planet_mu / departure_orbit_radius;
    const double v_orbit_arr_sq = arrival_planet_mu / arrival_orbit_radius;
    const double v_orbit_dep = std::sqrt(v_orbit_dep_sq);
    const double v_orbit_arr = std::sqrt(v_orbit_arr_sq);

    const v128_t v_v_orbit_dep_sq = wasm_f64x2_splat(v_orbit_dep_sq);
    const v128_t v_v_orbit_arr_sq = wasm_f64x2_splat(v_orbit_arr_sq);
    const v128_t v_v_orbit_dep = wasm_f64x2_splat(v_orbit_dep);
    const v128_t v_v_orbit_arr = wasm_f64x2_splat(v_orbit_arr);

    for (int i = 0; i < num_departure_dates; ++i)
    {
        double departure_jd = d1[i];
        double departure_time = julianDateToSeconds(departure_jd);
        vec3d r1_departure = {r1[i * 3], r1[i * 3 + 1], r1[i * 3 + 2]};
        vec3d v1_departure = {v1[i * 3], v1[i * 3 + 1], v1[i * 3 + 2]};

        v128_t departure_time_v = wasm_f64x2_splat(departure_time);

        int j = 0;
        for (; j < num_arrival_dates - 1; j += 2)
        {
            int index0 = i * num_arrival_dates + j;
            int index1 = index0 + 1;

            v128_t arrival_jd_v = wasm_v128_load(&d2[j]);
            v128_t arrival_time_v = julianDateToSeconds_simd(arrival_jd_v);

            v128_t tof_v = wasm_f64x2_sub(arrival_time_v, departure_time_v);

            //-------------------------------------------------------------------------------
            v128_t le_mask = wasm_f64x2_le(arrival_time_v, departure_time_v);
            v128_t lt_mask = wasm_f64x2_lt(tof_v, v_min_tof);

            v128_t invalid_mask = wasm_v128_or(le_mask, lt_mask);
            //Invalid date bit mask

            double results[2][3]; //C3, dv1, total_dv (j, j+1)
            bool possible[2] = {true, true};

            for (int k = 0; k < 2; ++k)
            {
                int current_j = j + k;
                int current_index = i * num_arrival_dates + current_j;
                double arrival_time = (k == 0)
                                      ? wasm_f64x2_extract_lane(arrival_time_v, 0)
                                      : wasm_f64x2_extract_lane(arrival_time_v, 1);
                double tof = (k == 0)
                             ? wasm_f64x2_extract_lane(tof_v, 0)
                             : wasm_f64x2_extract_lane(tof_v, 1);

                if (arrival_time <= departure_time || tof < MIN_TOF)
                {
                    results[k][0] = MAX_C3_CUTOFF;
                    results[k][1] = MAX_DV_CUTOFF;
                    results[k][2] = MAX_DV_CUTOFF;
                    possible[k] = false;
                    continue;
                }

                vec3d r2_arrival = {r2[current_j * 3 + 0], r2[current_j * 3 + 1], r2[current_j * 3 + 2]};
                vec3d v2_arrival = {v2[current_j * 3 + 0], v2[current_j * 3 + 1], v2[current_j * 3 + 2]};


                double best_total_dv = MAX_DV_CUTOFF;
                double best_dv1 = MAX_DV_CUTOFF;
                double best_c3 = MAX_C3_CUTOFF;

                for (bool shortPath: {true, false})
                {
                    auto [v1_transfer, v2_transfer] =
                            battin1984(mu, r1_departure, r2_arrival, tof, prograde, shortPath);

                    vec3d v_inf_departure = v1_transfer - v1_departure;
                    vec3d v_inf_arrival = v2_arrival - v2_transfer;

                    double c3_departure_sq = v_inf_departure.x() * v_inf_departure.x() +
                                             v_inf_departure.y() * v_inf_departure.y() +
                                             v_inf_departure.z() * v_inf_departure.z();
                    double c3_clamped = std::min(c3_departure_sq, MAX_C3_CUTOFF);

                    double dv1 = std::sqrt(2.0 * v_orbit_dep_sq + c3_clamped) - v_orbit_dep;

                    double c3_arrival_sq = v_inf_arrival.x() * v_inf_arrival.x() +
                                           v_inf_arrival.y() * v_inf_arrival.y() +
                                           v_inf_arrival.z() * v_inf_arrival.z();

                    double dv2 = std::sqrt(2.0 * v_orbit_arr_sq + c3_arrival_sq) - v_orbit_arr;

                    double total_dv = dv1 + dv2;

                    if (total_dv < best_total_dv)
                    {
                        best_total_dv = total_dv;
                        best_dv1 = dv1;
                        best_c3 = c3_clamped;
                    }
                }

                results[k][0] = std::min(best_c3, MAX_C3_CUTOFF);
                results[k][1] = std::min(best_dv1, MAX_DV_CUTOFF);
                results[k][2] = std::min(best_total_dv, MAX_DV_CUTOFF);

            }

            v128_t result_c3_v = wasm_f64x2_make(results[0][0], results[1][0]);
            v128_t result_dv1_v = wasm_f64x2_make(results[0][1], results[1][1]);
            v128_t result_total_dv_v = wasm_f64x2_make(results[0][2], results[1][2]);

            v128_t final_c3_v = wasm_v128_bitselect(v_max_c3_cutoff, result_c3_v, invalid_mask);
            v128_t final_dv1_v = wasm_v128_bitselect(v_max_dv_cutoff, result_dv1_v, invalid_mask);
            v128_t final_total_dv_v = wasm_v128_bitselect(v_max_dv_cutoff, result_total_dv_v, invalid_mask);

            wasm_v128_store(&result_c3[index0], final_c3_v);
            wasm_v128_store(&result_dv1[index0], final_dv1_v);
            wasm_v128_store(&result_total_dv[index0], final_total_dv_v);
        }

        if (j < num_arrival_dates)
        {
            int index = i * num_arrival_dates + j;

            result_c3[index] = MAX_C3_CUTOFF;
            result_dv1[index] = MAX_DV_CUTOFF;
            result_total_dv[index] = MAX_DV_CUTOFF;

            double arrival_jd = d2[j];
            double arrival_time_sec = julianDateToSeconds(arrival_jd);
            double tof = arrival_time_sec - departure_time;

            if (arrival_time_sec <= departure_time || tof < MIN_TOF)
            {
                continue;
            }

            vec3d r2_arrival = {r2[j * 3 + 0], r2[j * 3 + 1], r2[j * 3 + 2]};
            vec3d v2_arrival = {v2[j * 3 + 0], v2[j * 3 + 1], v2[j * 3 + 2]};

            double best_total_dv = std::numeric_limits<double>::infinity();
            double best_dv1 = MAX_DV_CUTOFF;
            double best_c3 = MAX_C3_CUTOFF;

            for (bool shortPath: {true, false})
            {
                auto [v1_transfer, v2_transfer] =
                        battin1984(mu, r1_departure, r2_arrival, tof, prograde, shortPath);

                vec3d v_inf_departure = v1_transfer - v1_departure;
                vec3d v_inf_arrival = v2_arrival - v2_transfer;

                double c3_departure_sq = v_inf_departure.x() * v_inf_departure.x() +
                                         v_inf_departure.y() * v_inf_departure.y() +
                                         v_inf_departure.z() * v_inf_departure.z();
                double c3_clamped = std::min(c3_departure_sq, MAX_C3_CUTOFF);

                double dv1 = std::sqrt(2.0 * v_orbit_dep_sq + c3_clamped) - v_orbit_dep;

                double c3_arrival_sq = v_inf_arrival.x() * v_inf_arrival.x() +
                                       v_inf_arrival.y() * v_inf_arrival.y() +
                                       v_inf_arrival.z() * v_inf_arrival.z();
                double dv2 = std::sqrt(2.0 * v_orbit_arr_sq + c3_arrival_sq) - v_orbit_arr;

                double total_dv = dv1 + dv2;

                if (total_dv < best_total_dv)
                {
                    best_total_dv = total_dv;
                    best_dv1 = dv1;
                    best_c3 = c3_clamped;
                }
            }

            result_c3[index] = std::min(best_c3, MAX_C3_CUTOFF);
            result_dv1[index] = std::min(best_dv1, MAX_DV_CUTOFF);
            result_total_dv[index] = std::min(best_total_dv, MAX_DV_CUTOFF);
        }
    }
}

#ifdef EMSCRIPTEN

EMSCRIPTEN_KEEPALIVE
#endif
std::vector<double> computePorkchopPlotWrapper(
        double mu,
        const emscripten::val &r1_js,
        const emscripten::val &v1_js,
        const emscripten::val &r2_js,
        const emscripten::val &v2_js,
        const emscripten::val &d1_js,
        const emscripten::val &d2_js,
        int num_departure_dates,
        int num_arrival_dates,
        double departure_planet_mu,
        double arrival_planet_mu,
        double departure_orbit_radius,
        double arrival_orbit_radius
)
{
    std::vector<double> r1 = emscripten::vecFromJSArray<double>(r1_js);
    std::vector<double> v1 = emscripten::vecFromJSArray<double>(v1_js);
    std::vector<double> r2 = emscripten::vecFromJSArray<double>(r2_js);
    std::vector<double> v2 = emscripten::vecFromJSArray<double>(v2_js);
    std::vector<double> d1 = emscripten::vecFromJSArray<double>(d1_js);
    std::vector<double> d2 = emscripten::vecFromJSArray<double>(d2_js);

    int total_results = num_departure_dates * num_arrival_dates;
    std::vector<double> result_c3(total_results);
    std::vector<double> result_dv1(total_results);
    std::vector<double> result_total_dv(total_results);


    auto start = std::chrono::high_resolution_clock::now();

    computePorkchopPlot_SIMD(mu, r1, v1, r2, v2, d1, d2,
                             num_departure_dates, num_arrival_dates, departure_planet_mu, arrival_planet_mu,
                             departure_orbit_radius, arrival_orbit_radius, result_c3, result_dv1, result_total_dv);

    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> duration = end - start;

    std::cout << "Execution time: " << duration.count() << " milliseconds" << std::endl;

    std::vector<double> all_results;
    all_results.insert(all_results.end(), result_c3.begin(), result_c3.end());
    all_results.insert(all_results.end(), result_dv1.begin(), result_dv1.end());
    all_results.insert(all_results.end(), result_total_dv.begin(), result_total_dv.end());

    return all_results;
}

EMSCRIPTEN_BINDINGS(porkchop_module)
{
    emscripten::register_vector<double>("VectorDouble");

    emscripten::function("computePorkchopPlot", &computePorkchopPlotWrapper,
                         emscripten::allow_raw_pointers());
}