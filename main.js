/*JavaScript function take 4 arguments:
    1. A list of team names
    2. A list of room names
    3. Desired number of times each team should face each other
    4. How many teams per round (2 or 3 at once)
*/

function generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound) {
  let rawSchedule;

  // Validate inputs
  if (teams.length < 2) {
    alert('At least 2 teams are required.');
    return [];
  }
  if (rooms.length < 1) {
    alert('At least 1 room is required.');
    return [];
  }
  if (rooms > teams / teamsPerRound) {
    alert('More rooms than needed. Recommend ~ ' + Math.ceil(teams / teamsPerRound) + ' rooms.');
    return [];
  }
  //Check if any teams or rooms have duplicate names
  const uniqueTeams = new Set(teams);
  if (uniqueTeams.size !== teams.length) {
    alert('Team names must be unique.');
    return [];
  }
  const uniqueRooms = new Set(rooms);
  if (uniqueRooms.size !== rooms.length) {
    alert('Room names must be unique.');
    return [];
  }


  switch (teamsPerRound) {
    case 2:
      rawSchedule = generateTwoTeamSchedule(teams, rooms, matchesPerTeam);
      break;
    case 3:
      rawSchedule = generateThreeTeamSchedule(teams, rooms, matchesPerTeam);
      break;
    default:
      throw new Error('Invalid number of teams per round. Must be 2 or 3.');
  }
  // Reformat schedule to expected format: array of objects, each with room names as keys and array of teams as values
  // Example: [{ Room 1: [A,B], Room 2: [C,D], ... }, ...]
  const formatted = rawSchedule.map(roundArr => {
    const roundObj = {};
    for (const match of roundArr) {
      // match: { room, teams }
      if (match.room && match.teams) {
        roundObj[match.room] = match.teams;
      }
    }
    // Ensure all rooms are present (for display)
    for (const room of rooms) {
      if (!(room in roundObj)) {
        roundObj[room] = [];
      }
    }
    return roundObj;
  });
  return formatted;
}

function generateTwoTeamSchedule(teams, rooms, matchesPerTeam) {
  // Teams: list of team names
  // Rooms: list of room names
  // Matches per team: number of times each team should see each other team
  // (i.e., if 2, then team A will see team B twice)
  // Format: [{ Room 1: [A,B], Room 2: [C,D]...}, {Room 1: [C, D]...} ...] you get the idea
  // Follow a round-robin style schedule.
  // If we don't have enough rooms, extra teams are put in a "Bye" room, they will not be forgotten!
  // If a team has no one to face, they will also be put in a "Bye" room.

  // We will use the two-row schedule algorithm, fix one team and rotate the others.

  // Round robin: keep one team fixed and rotate the others. Team 0 vs Team n/2, Team 1 vs Team n/2+1, etc.

  // First, calculate number of 'bye' teams needed. If odd, we need at least one. If we have insufficient rooms, we will need more.
  const numTeams = teams.length;
  const numRooms = rooms.length;
  const numByes = Math.max(0, Math.ceil((numTeams - numRooms) / 2));
  const totalTeams = numTeams + numByes; // Total teams including byes (fake teams)
  const midPoint = Math.floor(totalTeams / 2); // This is the index of the first team in the second row

  /* Plan is that we have a nested loop, where each team gets a turn to be fixed,
      and the others rotate around it. We will create a schedule for each round.

      Teams are placed in two rows, the top left team is fixed and the rest rotate.
      If teams are in indexes n-1-numByes to n-1, they are placed in the Bye room.

      Once all rotations have been done, we make the next team the fixed one and repeat.
      Since this process may produce duplicate matches, we need to check for them and skip rotations that have duplicate matches.
      
      We will map each team to a list of teams it has faced. Check against it before adding a match.
  */

  const schedule = [];
  const teamHistory = Map();//Map team name to a Set of teams it has faced
  for (const team of teams) {
    teamHistory.set(team, new Set());
  }

  for(let i = 0; i < numTeams; i++) {
    // This loop represents the time that team i is fixed.
    let fixedTeam = teams[i];
    let roatatingTeams = [...teams.slice(0, i), ...teams.slice(i + 1)];// All teams except the fixed one
    for (let j = 0; j < roatatingTeams.length; j++) {
      // This loop represents one rotation of the other teams - one chance to make a round.
      // Top row: teams 0 to midPoint-1
      // Bottom row: teams midPoint to totalTeams-1

      for (let k = 0; k < midPoint; k++) {
        // This loop represents one match in the potential round.
        let team1 = roatatingTeams[k]; // Team in the top row

        // Bottom row team might be a bye team. Check if k + midPoint is < numTeams. If so, we can use it.
        if (k + midPoint < totalTeams) {
          let team2 = rotatingTeams[k + midPoint];
          // Check if this match is valid (i.e., teams have not faced each other before)

          // We can do this by checking the first team's history.
          if (teamHistory.get(team1).has(team2)) { // We don't need to check the other way around.
            break;// This rotation is invalid, break to the next one.
          } 
        }
      }
      
    }
  }

}

// Example usage
/*
 const teams = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F'];
 const rooms = ['Room 1', 'Room 2', 'Room 3'];
 const matchesPerTeam = 2;
 const teamsPerRound = 3;

 const schedule = generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound);
 console.log(JSON.stringify(schedule, null, 2));*/

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

    console.log(JSON.stringify(schedule, null, 2)); // For debugging

    // Display schedule as HTML table
    displaySchedule(schedule, rooms);
    // Add CSV download button
    addCSVDownload(schedule, rooms);
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

function addCSVDownload(schedule, rooms) {
  // Remove old button if exists
  const csvDiv = document.getElementById('csv');
  if (!csvDiv) return;
  csvDiv.innerHTML = '';
  const oldBtn = document.getElementById('download-csv');
  if (oldBtn) oldBtn.remove();

  // Build CSV content
  let csv = ['Round,' + rooms.join(',')];
  schedule.forEach((round, i) => {
    const row = [
      `Round ${i + 1}`,
      ...rooms.map(room => {
        const match = round[room];
        return (match && match.length) ? match.join(' vs ') : '-';
      })
    ];
    csv.push(row.join(','));
  });
  const csvContent = csv.join('\r\n');

  // Create download button
  const btn = document.createElement('button');
  btn.id = 'download-csv';
  btn.textContent = 'Download CSV';
  btn.style.marginTop = '1em';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.csv';
    csvDiv.appendChild(a);
    a.click();
    setTimeout(() => {
      csvDiv.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });

  csvDiv.appendChild(btn);
}
