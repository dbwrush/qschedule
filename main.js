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

  // Use teamsPerRound to create an array of [room, capacity] pairs.
  // Create rooms with specified capacity
  roomSets = [];
  for (let i = 0; i < rooms.length; i++) {
    const roomName = rooms[i];
    // Default capacity is 2 if not specified
    if (teamsPerRound) {
      roomSets.push({ name: roomName, capacity: teamsPerRound });
    } else {
      roomSets.push({ name: roomName, capacity: 2 }); // Default capacity
    }
  }

  rawSchedule = generateSchedule(teams, roomSets);
  // If matchesPerTeam is specified, we need to repeat the schedule. Shuffle the rounds.
  if (matchesPerTeam > 1) {
    const repeatedSchedule = [];
    for (let i = 0; i < matchesPerTeam; i++) {
      // Shuffle the rounds to avoid repeating the same order
      const shuffledRounds = rawSchedule.map(round => {
        return round.sort(() => Math.random() - 0.5);
      });
      repeatedSchedule.push(...shuffledRounds);
    }
    rawSchedule = repeatedSchedule;
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

function generateSchedule(teams, rooms) {
  // Teams: list of team names
  // Rooms: list of room names
  // Matches per team: number of times each team should see each other team
  // (i.e., if 2, then team A will see team B twice)
  // Format: [{ Room 1: [A,B], Room 2: [C,D]...}, {Room 1: [C, D]...} ...] you get the idea
  // If we don't have enough rooms, extra teams are put in a "Bye" room, they will not be forgotten!
  // If a team has no one to face, they will also be put in a "Bye" room.

  /*
    THE PLAN:
    1. Create a list of all the pairs we need to play.
    2. Fill available rooms with pairs that aren't mutually exclusive
      (i.e., no two matches in the same round may have the same team participating).
    3. Create a sorted list of the teams by how many teams they've already faced.
    4. Use the sorted list to rank the remaining pairs by the 'priority' of the teams in them.
      (A match with less played teams is more important than a match with more played teams)
    5. Build the next found by filling in teams with highest priority into available rooms 
      (skipping matches that require a team already in another match this round).
    6. Repeat 3-5 until all matches are burned.
  */
  const schedule = [];
  let pairs = [];
  const teamMatchCount = new Map(); // Track how many matches each team has played

  // Step 1: Create all pairs of teams
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push({ team1: teams[i], team2: teams[j] });
    }
  }

  // Sort rooms in order of how many teams they can hold (rooms are arrays of [roomName, capacity])
  // Higher capacity rooms should go first. Access room capacity by room.capacity.
  rooms.sort((a, b) => {
    const capacityA = a.capacity || 2; // Default capacity is 2 if not specified
    const capacityB = b.capacity || 2;
    return capacityB - capacityA; // Sort descending by capacity
  });

  console.log("Rooms: ", rooms);

  // Core loop to generate rounds
  while (pairs.length > 0) {
    const round = [];
    const usedTeams = new Set(); // Track teams already used in this round
    const unusedTeams = new Set(teams); // Track teams that are not used in this round
    for (const room of rooms) {
      console.log(`Processing room: ${room.name} with capacity ${room.capacity}`);
      if (pairs.length === 0) break; // No more pairs to process

      // Find the next pair that can fit in this room
      const pairIndex = pairs.findIndex(pair => !usedTeams.has(pair.team1) && !usedTeams.has(pair.team2));
      if (pairIndex === -1) continue; // No valid pair found for this room

      const pair = pairs[pairIndex];
      usedTeams.add(pair.team1);
      usedTeams.add(pair.team2);
      unusedTeams.delete(pair.team1);
      unusedTeams.delete(pair.team2);

      // Update match count for the teams in this pair
      teamMatchCount.set(pair.team1, (teamMatchCount.get(pair.team1) || 0) + 1);
      teamMatchCount.set(pair.team2, (teamMatchCount.get(pair.team2) || 0) + 1);

      // Array of teams in the room
      let roomTeams = [pair.team1, pair.team2];

      console.log(`Adding match in room ${room.name}: ${pair.team1} vs ${pair.team2}`);

      // Remove the used pair from the list
      pairs.splice(pairIndex, 1);

      // Support 3+ teams per round by looking for another team that needs a match with all the teams already in the room
      for (let i = 2; i < room.capacity; i++) {
        // Create a list of all remaining pairs that include exactly one of the teams already in the room.
        // Then look over that list to see if there's an unused team that's mentioned with every team in the room.
        const remainingPairs = pairs.filter(p => {
          return (usedTeams.has(p.team1) && !usedTeams.has(p.team2)) ||
                 (usedTeams.has(p.team2) && !usedTeams.has(p.team1));
        });
        // If we have enough pairs, we can attempt to add another team to the room.
        if (remainingPairs.length >= roomTeams.length) {
          // Map of availableTeams to the remainingPairs they appear in
          const teamPairs = new Map();
          for (const team of unusedTeams) {
            teamPairs.set(team, []);
          }
          // List the remainingPairs each team appears in
          for (const pair of remainingPairs) {
            // Append pair to the teamPairs map
            if (unusedTeams.has(pair.team1)) {
              teamPairs.get(pair.team1).push(pair);
            }
            if (unusedTeams.has(pair.team2)) {
              teamPairs.get(pair.team2).push(pair);
            }
          }
          // Check if any in teamPairCount have roomTeams.length pairs. If so, we can add them to the room.
          for (const [team, appearances] of teamPairs.entries()) {
            if (appearances.length === roomTeams.length) {
              // We can add this team to the room
              console.log(roomTeams);
              roomTeams.push(team);
              console.log(roomTeams);
              usedTeams.add(team);
              unusedTeams.delete(team);
              // Remove the appearances from pairs]
              pairs = pairs.filter(pair => !appearances.includes(pair));
              // Update matches for the new team
              teamMatchCount.set(team, (teamMatchCount.get(team) || 0) + 1);
              console.log(`Added ${team} to room ${room.name}`);
              break; // Exit the loop after adding one team
            }
          }
        }
      }

      // Now we need to put the roomTeams into the round. The order of teams should be randomized to avoid bias.
      // Shuffle the roomTeams array
      for (let i = roomTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roomTeams[i], roomTeams[j]] = [roomTeams[j], roomTeams[i]];
      }
      // Add the room and its teams to the round
      round.push({ room: room.name, teams: roomTeams });
      console.log(`Added match in room ${room.name}: ${roomTeams.join(' vs ')}`);
    }

    // Now that we have filled the round, all teams that haven't been used are assigned to a "Bye" room.
    if (unusedTeams.size > 0) {
      const byeTeams = Array.from(unusedTeams);
      if (byeTeams.length > 0) {
        round.push({ room: "Bye", teams: byeTeams });
        console.log(`Bye teams for this round: ${byeTeams.join(', ')}`);
      }
    }
    console.log(`Round ${schedule.length + 1} matches:`, round);

    // Add the completed round to the schedule
    schedule.push(round);

    // Create a sorted list of teams by how many matches they have played
    const sortedTeams = Array.from(teamMatchCount.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by match count
      .map(entry => entry[0]); // Get team names
    // Sort remaining pairs by the piority of the teams in them (match score = sum of match counts of both teams, lower is better)
    pairs.sort((a, b) => {
      const scoreA = (teamMatchCount.get(a.team1) || 0) + (teamMatchCount.get(a.team2) || 0);
      const scoreB = (teamMatchCount.get(b.team1) || 0) + (teamMatchCount.get(b.team2) || 0);
      return scoreA - scoreB;// Sort by match score.
    });
    // Pairs are now sorted, go to next round.
  }

  return schedule;// just for debugging, we're not going to duplicate matches matchesPerTeam times yet.
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
