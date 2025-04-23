function anonymizeIP(ip) {
    if (!ip) return 'unknown';
    const v4 = ip.split('.');
    if (v4.length === 4) {
        return `${v4[0]}.${v4[1]}.*.*`;
    }
    else {
        const v6 = ip.split(':');
        return v6.slice(0, 2).join(':') + '::*';
    }
}
module.exports = anonymizeIP;