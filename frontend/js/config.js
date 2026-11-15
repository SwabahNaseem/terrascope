
/**
 * TerraScope - Central API and Environment Configuration
 * Provides dynamic API URL routing for Local Development, Vercel Proxy, and direct Render Backend.
 */

// If window.TERRASCOPE_BACKEND_URL is defined (e.g. injected in HTML or by developer), use;
// Otherwise fallback to the Render backend URL.
const API_BASE_URL = (typeof window !== 'undefined' && window.TERRASCOPE_BACKEND_URL)
    ? window.TERRASCOPE_BACKEND_URL.replace(/\/+$/, '')
    : 'https://terrascope-8brr.onrender.com';

export const API_CONFIG = {
    BASE_URL: API_BASE_URL,

    endpoints: {
        health: '/api/health',
        states: '/api/states',
        boundaries: '/api/boundaries',
        boundariesMeta: '/api/boundaries/meta',
        search: '/api/search',
        geocode: '/api/geocode',
        reverse: '/api/reverse',
        variables: '/api/variables',
        analysis: '/api/analysis',
        mapTrends: '/api/map-trends',
        report: '/api/report'
    },

    /**
     * Resolves a relative endpoint path to a full URL (if BASE_URL configured) with query parameters
     * @param {string} endpoint - API path or key
     * @param {Object} params - Query parameters object
     * @returns {string} Fully resolved URL
     */
    url(endpoint, params = {}) {
        let path = this.endpoints[endpoint] || endpoint;

        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        const fullPath = `${this.BASE_URL}${path}`;

        const queryEntries = Object.entries(params).filter(
            ([_, v]) => v !== undefined && v !== null && v !== ''
        );

        if (queryEntries.length === 0) {
            return fullPath;
        }

        const searchParams = new URLSearchParams();

        queryEntries.forEach(([k, v]) => searchParams.append(k, String(v)));

        return `${fullPath}?${searchParams.toString()}`;
    }
};
