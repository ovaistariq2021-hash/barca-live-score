const https = require('https');

const BARCA_TEAM_ID = 81;
const API_HOST = 'api.football-data.org';

function apiGet(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            path,
            method: 'GET',
            headers: {
                'X-Auth-Token': process.env.FOOTBALL_API_KEY
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error(`football-data.org request failed: ${res.statusCode} ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED']);
const UPCOMING_STATUSES = new Set(['SCHEDULED', 'TIMED']);

function isoDate(date) {
    return date.toISOString().slice(0, 10);
}

async function getBarcaStatus() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

    const data = await apiGet(
        `/v4/teams/${BARCA_TEAM_ID}/matches?dateFrom=${isoDate(windowStart)}&dateTo=${isoDate(windowEnd)}`
    );
    const matches = data.matches || [];

    const live = matches.find((m) => LIVE_STATUSES.has(m.status));
    if (live) {
        return { type: 'live', match: live };
    }

    const upcoming = matches
        .filter((m) => UPCOMING_STATUSES.has(m.status))
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0];
    if (upcoming) {
        return { type: 'upcoming', match: upcoming };
    }

    const lastFinished = matches
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))[0];
    if (lastFinished) {
        return { type: 'finished', match: lastFinished };
    }

    return { type: 'none', match: null };
}

module.exports = { getBarcaStatus, BARCA_TEAM_ID };
