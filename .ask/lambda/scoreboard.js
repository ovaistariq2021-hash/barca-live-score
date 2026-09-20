function statusPresentation(type, match) {
    if (type === 'live') {
        const label = match.status === 'PAUSED' ? 'HALF-TIME' : 'LIVE';
        return { statusLabel: label, statusColor: '#D8262C' };
    }
    if (type === 'upcoming') {
        return { statusLabel: 'UPCOMING', statusColor: '#EDBB00' };
    }
    if (type === 'finished') {
        return { statusLabel: 'FULL-TIME', statusColor: '#4A4A4A' };
    }
    return { statusLabel: 'NO DATA', statusColor: '#4A4A4A' };
}

function formatKickoff(utcDate) {
    const date = new Date(utcDate);
    return date.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

const BARCA_TEAM_ID = 81;

function buildScoreboard(status) {
    const { type, match } = status;

    if (type === 'none' || !match) {
        return {
            speech: "I couldn't find any recent or upcoming Barca matches right now.",
            datasource: {
                scoreboard: {
                    competition: 'FC Barcelona',
                    statusLabel: 'NO DATA',
                    statusColor: '#4A4A4A',
                    homeName: 'Barca',
                    awayName: '?',
                    homeCrest: 'https://crests.football-data.org/81.png',
                    awayCrest: 'https://crests.football-data.org/81.png',
                    homeScore: '-',
                    awayScore: '-',
                    clock: '',
                    footer: 'Check back closer to the next matchday.'
                }
            }
        };
    }

    const { statusLabel, statusColor } = statusPresentation(type, match);
    const homeName = match.homeTeam.shortName || match.homeTeam.name;
    const awayName = match.awayTeam.shortName || match.awayTeam.name;
    const homeScore = match.score && match.score.fullTime && match.score.fullTime.home !== null
        ? match.score.fullTime.home : 0;
    const awayScore = match.score && match.score.fullTime && match.score.fullTime.away !== null
        ? match.score.fullTime.away : 0;

    const datasource = {
        scoreboard: {
            competition: match.competition ? match.competition.name : 'Match',
            statusLabel,
            statusColor,
            homeName,
            awayName,
            homeCrest: match.homeTeam.crest,
            awayCrest: match.awayTeam.crest,
            homeScore: type === 'upcoming' ? '' : homeScore,
            awayScore: type === 'upcoming' ? '' : awayScore,
            clock: type === 'live' ? statusLabel : '',
            footer: type === 'upcoming'
                ? `Kickoff: ${formatKickoff(match.utcDate)}`
                : type === 'finished'
                    ? `Played on ${formatKickoff(match.utcDate)}`
                    : 'Tracking live on your Echo Show'
        }
    };

    const opponentName = match.homeTeam.id === BARCA_TEAM_ID ? awayName : homeName;

    let speech;
    if (type === 'live') {
        speech = `It's currently ${homeName} ${homeScore}, ${awayName} ${awayScore}. `
            + `${statusLabel === 'HALF-TIME' ? "They're at half-time." : "The match is live right now."}`;
    } else if (type === 'upcoming') {
        speech = `Barca's next match is against ${opponentName}, `
            + `kicking off ${formatKickoff(match.utcDate)}.`;
    } else {
        speech = `The last match finished ${homeName} ${homeScore}, ${awayName} ${awayScore}.`;
    }

    return { speech, datasource };
}

module.exports = { buildScoreboard };
