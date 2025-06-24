// roundRobinScheduler.js
/**
 * Generate a round robin schedule for given teams, rooms, and matches per team.
 * @param {string[]} teams - Array of team names
 * @param {string[]} rooms - Array of room names
 * @param {number} matchesPerTeam - Number of times each team should play every other team
 * @param {number} teamsPerRound - Number of teams per round (for grouping)
 * @returns {Array} Array of rounds, each round is an object with room names as keys and arrays of teams as values
 */
function generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound) {
  let numTeams = teams.length;
  let teamsList = [...teams];
  let rounds = [];

  // Calculate byes needed for perfect fit
  let groupSize = teamsPerRound;
  let numGroups = Math.ceil(numTeams / groupSize);
  let totalSlots = numGroups * groupSize;
  let numByes = totalSlots - numTeams;
  // Only add byes if needed
  for (let i = 0; i < numByes; i++) {
    teamsList.push('Bye');
  }
  numTeams = teamsList.length;

  // Track how many times each pair/group has played
  const pairCounts = {};
  function getPairKey(arr) {
    return arr.filter(t => t !== 'Bye').sort().join('::');
  }

  // Each team/group plays every other group matchesPerTeam times
  let numRounds = (numTeams - 1) * matchesPerTeam / (groupSize - 1);
  numRounds = Math.ceil(numRounds);

  for (let m = 0; m < matchesPerTeam; m++) {
    let arr = teamsList.slice();
    for (let r = 0; r < numTeams - 1; r++) {
      let round = {};
      let usedTeams = new Set();
      let groupings = [];
      // Form groups for this round
      for (let i = 0; i < arr.length; i++) {
        if (usedTeams.has(arr[i])) continue;
        let group = [arr[i]];
        usedTeams.add(arr[i]);
        for (let j = i + 1; j < arr.length && group.length < groupSize; j++) {
          if (!usedTeams.has(arr[j])) {
            group.push(arr[j]);
            usedTeams.add(arr[j]);
          }
        }
        // Don't allow all byes in a group
        if (group.every(t => t === 'Bye')) continue;
        // Don't allow more than one bye per group
        if (group.filter(t => t === 'Bye').length > 1) continue;
        // Don't allow a group to play more than matchesPerTeam times
        const key = getPairKey(group);
        if (key && pairCounts[key] && pairCounts[key] >= matchesPerTeam) continue;
        groupings.push(group);
        if (key) pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
      // Assign groups to rooms
      for (let g = 0; g < groupings.length && g < rooms.length; g++) {
        round[rooms[g]] = groupings[g];
      }
      rounds.push(round);
      // Rotate array for next round (except first element)
      arr = [arr[0]].concat([arr[arr.length - 1]].concat(arr.slice(1, arr.length - 1)));
    }
  }
  return rounds;
}

// Example usage:
// const teams = ['A', 'B', 'C', 'D', 'E'];
// const rooms = ['Room 1', 'Room 2'];
// const matchesPerTeam = 2;
// const teamsPerRound = 3;
// const schedule = generateMatchSchedule(teams, rooms, matchesPerTeam, teamsPerRound);
// console.log(JSON.stringify(schedule, null, 2));

if (typeof module !== 'undefined') {
  module.exports = { generateMatchSchedule };
}




















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
