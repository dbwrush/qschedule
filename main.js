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

// Implement frontend to display the schedule using input

document.addEventListener('DOMContentLoaded', () => {
  // Add Team button functionality
  document.getElementById('add-team').addEventListener('click', (e) => {
    e.preventDefault();
    const teamsDiv = document.querySelector('.teams');
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'team';
    input.name = 'teams';
    input.placeholder = 'Team Name';
    input.required = true;
    teamsDiv.appendChild(input);
  });

  // Add Room button functionality
  document.getElementById('add-room').addEventListener('click', (e) => {
    e.preventDefault();
    const roomsDiv = document.querySelector('.rooms');
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'room';
    input.name = 'rooms';
    input.placeholder = 'Room Name';
    input.required = true;
    roomsDiv.appendChild(input);
  });

  // Handle form submission
  document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    // Get all team names
    const teamInputs = document.querySelectorAll('input[name="teams"]');
    const teams = Array.from(teamInputs).map(input => input.value.trim()).filter(Boolean);
    // Get all room names
    const roomInputs = document.querySelectorAll('input[name="rooms"]');
    const rooms = Array.from(roomInputs).map(input => input.value.trim()).filter(Boolean);
    // Get matches per team
    const matchesPerTeam = parseInt(document.getElementById('matches').value, 10);
    // Get teams per round
    const teamsPerRound = parseInt(document.getElementById('tpr').value, 10);

    // Generate schedule
    const schedule = generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound);

    // Display schedule as HTML table
    displaySchedule(schedule, rooms);
  });
});

function displaySchedule(schedule, rooms) {
  // Remove old table if exists
  const oldTable = document.getElementById('schedule-table');
  if (oldTable) oldTable.remove();

  const container = document.querySelector('.container');
  const table = document.createElement('table');
  table.id = 'schedule-table';
  table.style.marginTop = '2em';
  table.border = '1';

  // Table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const roundHeader = document.createElement('th');
  roundHeader.textContent = 'Round';
  headerRow.appendChild(roundHeader);
  rooms.forEach(room => {
    const th = document.createElement('th');
    th.textContent = room;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  schedule.forEach((round, i) => {
    const row = document.createElement('tr');
    const roundCell = document.createElement('td');
    roundCell.textContent = `Round ${i + 1}`;
    row.appendChild(roundCell);
    rooms.forEach(room => {
      const cell = document.createElement('td');
      const match = round[room];
      cell.textContent = (match && match.length) ? match.join(' vs ') : '-';
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}
