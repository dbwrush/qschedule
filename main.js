/*JavaScript function take 4 arguments:
    1. A list of team names
    2. A list of room names
    3. Desired number of times each team should face each other
    4. How many teams per round (2 or 3 at once)
*/

function generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound) {
  let rawSchedule;
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

function generateThreeTeamSchedule(teams, rooms, matchesPerTeam) {
  let numTeams = teams.length;
  let teamsList = [...teams];
  // Add byes if needed to make the number of teams divisible by 3
  let numByes = (3 - (numTeams % 3)) % 3;
  for (let i = 0; i < numByes; i++) {
    teamsList.push('Bye');
  }
  numTeams = teamsList.length;
  const rounds = [];
  const numGroups = numTeams / 3;
  const numRounds = (numTeams - 1) * matchesPerTeam / 2; // Each round: every team appears once

  // Helper to shuffle room assignments
  function shuffle(arr) {
    let a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Generate base triangular rounds using rotation
  let baseRounds = [];
  let arr = teamsList.slice();
  for (let r = 0; r < numTeams - 1; r++) {
    let round = [];
    for (let g = 0; g < numGroups; g++) {
      let t1 = arr[(g * 3) % numTeams];
      let t2 = arr[(g * 3 + 1) % numTeams];
      let t3 = arr[(g * 3 + 2) % numTeams];
      round.push([t1, t2, t3]);
    }
    baseRounds.push(round);
    // Rotate: keep first team fixed, rotate the rest
    arr = [arr[0]].concat(arr.slice(1).slice(-1)).concat(arr.slice(1, -1));
  }

  // Repeat base rounds matchesPerTeam times, shuffling order each time
  let allRounds = [];
  for (let m = 0; m < matchesPerTeam; m++) {
    let copy = baseRounds.map(round => round.slice());
    // Shuffle the order of rounds for variety
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    allRounds = allRounds.concat(copy);
  }

  // Assign groups to rooms per round
  for (let r = 0; r < allRounds.length; r++) {
    let groups = allRounds[r];
    let roomOrder = shuffle(rooms.concat());
    let round = [];
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      let room = roomOrder[i % rooms.length] || 'Bye';
      let realTeams = group.filter(t => t !== 'Bye');
      if (realTeams.length === 1) {
        round.push({ room: 'Bye', teams: realTeams });
      } else if (realTeams.length === 2) {
        round.push({ room, teams: realTeams });
      } else if (realTeams.length === 3) {
        round.push({ room, teams: realTeams });
      }
      // If all are 'Bye', skip
    }
    rounds.push(round);
  }

  return rounds;
}

function generateTwoTeamSchedule(teams, rooms, matchesPerTeam) {
  let numTeams = teams.length;
  let isOdd = numTeams % 2 !== 0;
  let teamsList = [...teams];
  if (isOdd) {
    teamsList.push('Bye');
    numTeams++;
  }
  const rounds = [];
  const numRounds = (numTeams - 1) * matchesPerTeam;
  const half = numTeams / 2;

  // For shuffling room assignments per round
  function shuffle(arr) {
    let a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Generate base round-robin for one cycle
  let baseRounds = [];
  let arr = teamsList.slice();
  for (let r = 0; r < numTeams - 1; r++) {
    let matches = [];
    for (let i = 0; i < half; i++) {
      let t1 = arr[i];
      let t2 = arr[numTeams - 1 - i];
      matches.push([t1, t2]);
    }
    baseRounds.push(matches);
    // Rotate except first team
    arr = [arr[0]].concat([arr[numTeams - 1]].concat(arr.slice(1, numTeams - 1)));
  }

  // Repeat base rounds matchesPerTeam times, shuffling order each time
  let allRounds = [];
  for (let m = 0; m < matchesPerTeam; m++) {
    let copy = baseRounds.map(round => round.slice());
    // Shuffle the order of rounds for variety
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    allRounds = allRounds.concat(copy);
  }

  // Assign matches to rooms per round
  for (let r = 0; r < allRounds.length; r++) {
    let matches = allRounds[r];
    let roomOrder = shuffle(rooms.concat());
    let round = [];
    for (let i = 0; i < matches.length; i++) {
      let [t1, t2] = matches[i];
      let room = roomOrder[i % rooms.length] || 'Bye';
      if (t1 === 'Bye') {
        round.push({ room: 'Bye', teams: [t2] });
      } else if (t2 === 'Bye') {
        round.push({ room: 'Bye', teams: [t1] });
      } else {
        round.push({ room, teams: [t1, t2] });
      }
    }
    rounds.push(round);
  }

  return rounds;
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
  btn.addEventListener('click', () => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });

  const container = document.querySelector('.container');
  container.appendChild(btn);
}
