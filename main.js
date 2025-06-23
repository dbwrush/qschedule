/*JavaScript function take 4 arguments:
    1. A list of team names
    2. A list of room names
    3. Desired number of times each team should face each other
    4. How many teams per round (2 or 3 at once)
*/

function generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound) {
  const rounds = [];
  const matchCounts = new Map(); // key: "Team A-Team B", value: number of matches

  const getPairKey = (a, b) => [a, b].sort().join("-");

  // Initialize pair match counts
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchCounts.set(getPairKey(teams[i], teams[j]), 0);
    }
  }

  const getUnfilledPairs = () => {
    return Array.from(matchCounts.entries())
      .filter(([_, count]) => count < matchesPerTeam)
      .map(([key]) => key.split("-"));
  };

  const scheduleMatch = (match) => {
    for (let i = 0; i < match.length; i++) {
      for (let j = i + 1; j < match.length; j++) {
        const key = getPairKey(match[i], match[j]);
        matchCounts.set(key, matchCounts.get(key) + 1);
      }
    }
  };

  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  while (getUnfilledPairs().length > 0) {
    const round = {};
    const usedTeams = new Set();

    // Shuffle the team order to vary starting positions each round
    const shuffledTeams = [...teams];
    shuffle(shuffledTeams);

    const candidates = getUnfilledPairs().filter(
      ([a, b]) => !usedTeams.has(a) && !usedTeams.has(b)
    );

    for (const room of rooms) {
      let match = null;

      // Try 3-team match
      if (teamsPerRound === 3) {
        for (let i = 0; i < shuffledTeams.length; i++) {
          const a = shuffledTeams[i];
          if (usedTeams.has(a)) continue;

          for (let j = i + 1; j < shuffledTeams.length; j++) {
            const b = shuffledTeams[j];
            if (usedTeams.has(b) || matchCounts.get(getPairKey(a, b)) >= matchesPerTeam) continue;

            for (let k = j + 1; k < shuffledTeams.length; k++) {
              const c = shuffledTeams[k];
              if (usedTeams.has(c)) continue;

              const ab = matchCounts.get(getPairKey(a, b)) ?? 0;
              const ac = matchCounts.get(getPairKey(a, c)) ?? 0;
              const bc = matchCounts.get(getPairKey(b, c)) ?? 0;

              if (ab < matchesPerTeam && ac < matchesPerTeam && bc < matchesPerTeam) {
                match = [a, b, c];
                break;
              }
            }
            if (match) break;
          }
          if (match) break;
        }
      }

      // Fallback to 2-team match
      if (!match) {
        for (let i = 0; i < shuffledTeams.length; i++) {
          const a = shuffledTeams[i];
          if (usedTeams.has(a)) continue;

          for (let j = i + 1; j < shuffledTeams.length; j++) {
            const b = shuffledTeams[j];
            if (
              usedTeams.has(b) ||
              matchCounts.get(getPairKey(a, b)) >= matchesPerTeam
            ) continue;

            match = [a, b];
            break;
          }

          if (match) break;
        }
      }

      if (match) {
        match.forEach((team) => usedTeams.add(team));
        scheduleMatch(match);
        round[room] = match;
      } else {
        round[room] = []; // empty room
      }
    }

    rounds.push(round);
  }

  return rounds;
}

// Example usage
const teams = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F'];
const rooms = ['Room 1', 'Room 2', 'Room 3'];
const matchesPerTeam = 2;
const teamsPerRound = 3;

const schedule = generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound);
console.log(JSON.stringify(schedule, null, 2));