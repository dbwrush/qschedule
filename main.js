function generateMatchSchedule(teams, rooms, matchesPerTeam) {
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
  const uniqueRooms = new Set(rooms.map(r => r.name));
  if (uniqueRooms.size !== rooms.length) {
    alert('Room names must be unique.');
    return [];
  }

  // Pass rooms directly to generateSchedule
  rawSchedule = generateRoundRobinSchedule(teams, rooms);
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
      if (!(room.name in roundObj)) {
        roundObj[room.name] = [];
      }
    }
    return roundObj;
  });
  return formatted;
}

function generateRoundRobinSchedule(teams, rooms) {
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

function calcTournament(teams, rooms, eliminationType = 'Single Elimination') {
  // Not a scheduler, instead this one uses the number of teams and the room info to calculate the number of rounds needed.
  // Since the teams participating in a tournament depend on the results of previous rounds, we can't make a schedule in advance.
  // Instead, we're just calculating what the fewest number of rounds needed for a tournament is, and determining which rooms should be used.

  // Start by sorting the rooms by capacity to a new array.
  const sortedRooms = rooms.slice().sort((a, b) => (b.capacity || 2) - (a.capacity || 2));

  let rounds = [];
  
  if (eliminationType === 'Single Elimination') {
    let remainingTeams = teams.length;
    
    while (remainingTeams > 1) {
      let round = [];
      let teamsInRound = 0;
      
      // Fill rooms for this round
      for (let i = 0; i < sortedRooms.length && teamsInRound < remainingTeams; i++) {
        const room = sortedRooms[i];
        const roomCapacity = room.capacity || 2;
        if (teamsInRound + roomCapacity <= remainingTeams) {
          round.push(room);
          teamsInRound += roomCapacity;
        }
      }
      
      rounds.push(round);
      remainingTeams = Math.ceil(teamsInRound / 2); // Winners advance to next round
    }
  } else if (eliminationType === 'Double Elimination') {
    // Double elimination has winners bracket and losers bracket
    // Winners bracket: same as single elimination but losers go to losers bracket
    // Losers bracket: losers from winners bracket play against each other, with additional elimination rounds
    
    let winnersRemaining = teams.length;
    let losersRemaining = 0;
    let roundNumber = 1;
    
    while (winnersRemaining > 1 || losersRemaining > 0) {
      let round = [];
      let teamsInRound = 0;
      let roomsUsed = 0;
      
      // Calculate teams that need to play this round
      let winnersThisRound = 0;
      let losersThisRound = 0;
      
      if (winnersRemaining > 1) {
        // Winners bracket matches
        winnersThisRound = Math.floor(winnersRemaining / 2) * 2; // Even number for complete matches
        if (winnersRemaining % 2 === 1) {
          winnersThisRound = winnersRemaining - 1; // One team gets a bye
        }
      }
      
      if (losersRemaining > 1) {
        // Losers bracket matches
        losersThisRound = Math.floor(losersRemaining / 2) * 2;
        if (losersRemaining % 2 === 1) {
          losersThisRound = losersRemaining - 1; // One team gets a bye
        }
      } else if (losersRemaining === 1 && winnersRemaining === 1) {
        // Final match: winner of losers bracket vs winner of winners bracket
        losersThisRound = 1;
        winnersThisRound = 1;
      }
      
      let totalTeamsThisRound = winnersThisRound + losersThisRound;
      
      if (totalTeamsThisRound === 0) break;
      
      // Fill rooms for this round, accounting for both winners and losers bracket matches
      for (let i = 0; i < sortedRooms.length && teamsInRound < totalTeamsThisRound; i++) {
        const room = sortedRooms[i];
        const roomCapacity = room.capacity || 2;
        if (teamsInRound + roomCapacity <= totalTeamsThisRound) {
          round.push(room);
          teamsInRound += roomCapacity;
          roomsUsed++;
        }
      }
      
      // If we can't fit all matches in available rooms, we need multiple rounds
      if (teamsInRound < totalTeamsThisRound) {
        // Priority goes to winners bracket, then losers bracket
        let actualWinnersThisRound = Math.min(winnersThisRound, teamsInRound);
        let actualLosersThisRound = Math.min(losersThisRound, teamsInRound - actualWinnersThisRound);
        
        rounds.push(round);
        
        // Update remaining teams based on what actually played
        if (actualWinnersThisRound > 0) {
          let newLosers = Math.floor(actualWinnersThisRound / 2);
          winnersRemaining = winnersRemaining - actualWinnersThisRound + Math.ceil(actualWinnersThisRound / 2);
          losersRemaining += newLosers;
        }
        
        if (actualLosersThisRound > 0) {
          losersRemaining = losersRemaining - actualLosersThisRound + Math.ceil(actualLosersThisRound / 2);
        }
      } else {
        // All matches fit in this round
        rounds.push(round);
        
        // Update remaining teams
        if (winnersThisRound > 0) {
          let newLosers = Math.floor(winnersThisRound / 2);
          winnersRemaining = winnersRemaining - winnersThisRound + Math.ceil(winnersThisRound / 2);
          losersRemaining += newLosers;
        }
        
        if (losersThisRound > 0) {
          losersRemaining = losersRemaining - losersThisRound + Math.ceil(losersThisRound / 2);
        }
        
        // Special case: if we just had the final match
        if (winnersRemaining === 1 && losersRemaining === 1 && winnersThisRound === 1 && losersThisRound === 1) {
          // The match is complete, but in double elimination, if the loser bracket winner beats the winner bracket winner,
          // they need to play again. For simplicity, we'll assume one final match is sufficient.
          break;
        }
      }
      
      roundNumber++;
      
      // Safety break to prevent infinite loops
      if (roundNumber > teams.length * 2) {
        console.warn('Double elimination calculation exceeded expected rounds, breaking');
        break;
      }
    }
  }

  return rounds;
}

function genCSVSchedule(teamRosters, rooms, eventName, division, tournament, doFinals, finalsTournament, matchesPerTeam, schedule) {
  let output = "";

  // Begin by printing a team roster. Column 1 = team name, Column 2 is quizzer name.
  for (let i = 0; i < teamRosters.length; i++) {
    for (let k = 1; k < teamRosters[i].length; k++) { //Start at 1 because index 0 is the team name;
      output += teamRosters[i][0] + "," + teamRosters[i][k] + ",\n";
    }
  }

  // rooms is an array of rooms. Each room is also an array, Index 0 is the name.
  // Index 1 - 3 are a true or false depending on if that room can have a team in that slot.
  // EX: A room that can have a team on left and center but not right may look like: ["Room 3", true, true, false]

  /* Schedule row format:
      - Timestamp - YYYY-MM-DD-HH:MM:SS.MMMMMM (realistically, seconds and milliseconds are always 0);
      - Event name
      - Division [Usually Experienced or Novice, but not always]
      - Room number
      - Round number (For non-finals, increment by 1. For finals, increment from Semi-Final, Consolation, Finals)
      - Room left team number     - teams index of the team assigned to left slot
      - Room center team number   - teams index of the team assigned to center slot
      - Room right team number    - teams index of the team assigned to right slot
      - In a final tournament, the room assignments are blank.
      - Quizmaster name - leave blank.
      - Content Judge name - leave blank.
      - Scorekeeper name - leave blank.
      - Tournament name. If this is part of finals, use the finalsTournament, otherwise use tournament.

      Typically all the matches in a single room will come consecutively, and then we we do the next room. 
      So a schedule would show room 1's matches for rounds 1 - n, then it would do room 2, etc.
  */

  // Convert teams and rooms as lists usable in generateMatchSchedule
  // teams = an array of team names, simple as that.
  // rooms = an array of room objects with name and capacity.

  let teams = [];
  for (let i = 0; i < teamRosters.length; i++) {
    teams.push(teamRosters[i][0]);
  }

  // Use the provided schedule instead of generating a new one

  // Helper function to get current timestamp
  function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', '-').replace(/\.\d{3}Z$/, '.000000');
  }

  // Helper function to get team index by name
  function getTeamIndex(teamName) {
    for (let i = 0; i < teams.length; i++) {
      if (teams[i] === teamName) {
        return i;
      }
    }
    return -1; // Team not found
  }

  // Add each room's schedule to the output.
  for (let i = 0; i < rooms.length; i++) {  // Iterate over rooms
    const currentRoom = rooms[i];
    const roomName = currentRoom.name;
    
    for (let j = 0; j < schedule.length; j++) { // Iterate over the rounds
      let round = schedule[j];
      
      // Find matches for this room in this round
      if (round[roomName] && round[roomName].length > 0) {
        const teamsInMatch = round[roomName];
        const roundNumber = j + 1;
        
        // Create CSV row for this match
        let csvRow = getCurrentTimestamp() + ","; // Timestamp
        csvRow += eventName + ","; // Event name
        csvRow += division + ","; // Division
        csvRow += roomName + ","; // Room number
        csvRow += roundNumber + ","; // Round number
        
        // Get the room configuration to determine which slots are available
        const room = rooms[i]; // currentRoom
        const capacity = room.capacity || 2; // Default capacity is 2 if not specified

        // Assign teams to available slots in order
        let leftTeam = "";
        let centerTeam = "";
        let rightTeam = "";
        
        // There is always a left and right slot, but center is only included if we need capacity for 3 teams.
        if (teamsInMatch.length > 2) {
          centerTeam = teamsInMatch[1];
        }
        leftTeam = teamsInMatch[0];
        rightTeam = teamsInMatch[teamsInMatch.length - 1];

        csvRow += leftTeam + ","; // Room left team number
        csvRow += centerTeam + ","; // Room center team number  
        csvRow += rightTeam + ","; // Room right team number
        
        csvRow += ","; // Quizmaster name - blank
        csvRow += ","; // Content Judge name - blank
        csvRow += ","; // Scorekeeper name - blank
        csvRow += tournament; // Tournament name
        csvRow += "\n";
        
        output += csvRow;
      }
    }
    
    // Now that the tournament rounds are done, see if we're doing finals also.
    if (doFinals && doFinals !== 'None') {
      // Use calcTournament to determine how many rounds of finals this room is being used for.
      const finalRounds = calcTournament(teams, rooms, doFinals);
      
      for (let roundIdx = 0; roundIdx < finalRounds.length; roundIdx++) {
        const finalRound = finalRounds[roundIdx];
        
        // Generate correct round names: last is "Finals", second-last is "Consolation", rest are "Semi-Final"
        let roundName;
        const totalRounds = finalRounds.length;
        if (roundIdx === totalRounds - 1) {
          roundName = "Finals";
        } else if (roundIdx === totalRounds - 2) {
          roundName = "Consolation";
        } else {
          roundName = "Semi-Final";
        }
        
        // Check if current room is used in this final round
        const isRoomUsed = finalRound.some(room => room.name === roomName);
        
        if (isRoomUsed) {
          let csvRow = getCurrentTimestamp() + ","; // Timestamp
          csvRow += eventName + ","; // Event name
          csvRow += division + ","; // Division
          csvRow += roomName + ","; // Room number
          csvRow += roundName + ","; // Round name
          
          // In finals, team assignments are blank as noted in comments
          csvRow += ","; // Room left team number - blank
          csvRow += ","; // Room center team number - blank
          csvRow += ","; // Room right team number - blank
          
          csvRow += ","; // Quizmaster name - blank
          csvRow += ","; // Content Judge name - blank
          csvRow += ","; // Scorekeeper name - blank
          csvRow += finalsTournament; // Tournament name for finals
          csvRow += "\n";
          
          output += csvRow;
        }
      }
    }
  }
  
  return output;
}

// Implement frontend to display the schedule using input
// document.addEventListener('DOMContentLoaded', () => {
//   // Add Team button functionality
//   document.getElementById('add-team').addEventListener('click', (e) => {
//     e.preventDefault();
//     const teamsDiv = document.querySelector('.teams');
//     const teamSection = document.createElement('div');
//     teamSection.className = 'team-section';
    
//     const teamHeader = document.createElement('div');
//     teamHeader.className = 'team-header';
//     const teamNameInput = document.createElement('input');
//     teamNameInput.type = 'text';
//     teamNameInput.className = 'team-name';
//     teamNameInput.name = 'team-names';
//     teamNameInput.placeholder = 'Team Name';
//     teamNameInput.required = true;
//     teamHeader.appendChild(teamNameInput);
    
//     const teamMembers = document.createElement('div');
//     teamMembers.className = 'team-members';
//     for (let i = 1; i <= 5; i++) {
//       const memberInput = document.createElement('input');
//       memberInput.type = 'text';
//       memberInput.className = 'team-member';
//       memberInput.name = 'team-members';
//       memberInput.placeholder = `Team Member ${i}`;
//       teamMembers.appendChild(memberInput);
//     }
    
//     teamSection.appendChild(teamHeader);
//     teamSection.appendChild(teamMembers);
//     teamsDiv.appendChild(teamSection);
//   });

// document.getElementById('add-room').addEventListener('click', (e) => {
//   e.preventDefault();
//   const roomsDiv = document.querySelector('.rooms');
//   const roomRow = document.createElement('div');
//   roomRow.className = 'room-row';
//   roomRow.innerHTML = `
//     <input type="text" name="rooms" placeholder="Room Name" required="true">
//     <div class="room-slots">
//       <label class="switch">
//         <input type="checkbox" class="room-toggle" name="room-3team">
//         <span class="slider"></span>
//       </label>
//       <span class="toggle-label">3-Team Room</span>
//     </div>
//   `;
//   roomsDiv.appendChild(roomRow);
// });

  // Handle form submission
  document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get team data with members
    const teamSections = document.querySelectorAll('.team-section');
    const teamRosters = [];
    
    teamSections.forEach(section => {
      const teamNameInput = section.querySelector('.team-name');
      const teamName = teamNameInput.value.trim();
      
      if (teamName) {
        const teamRoster = [teamName]; // First element is team name
        const memberInputs = section.querySelectorAll('.team-member');
        
        memberInputs.forEach(input => {
          const memberName = input.value.trim();
          if (memberName) {
            teamRoster.push(memberName);
          }
        });
        
        teamRosters.push(teamRoster);
      }
    });
    
    // Extract just team names for the existing schedule generation
    const teams = teamRosters.map(roster => roster[0]);
    
    // Get all room names and configurations
    const roomRows = document.querySelectorAll('.rooms .room-row');
    const rooms = []; // For existing schedule generation
    
    roomRows.forEach(row => {
      const nameInput = row.querySelector('input[name="rooms"]');
      const roomName = nameInput.value.trim();
      
      if (roomName) {
        const threeTeamToggle = row.querySelector('input[name="room-3team"]');
        // Calculate capacity based on 3-team toggle
        const capacity = threeTeamToggle?.checked ? 3 : 2;
        
        rooms.push({
          name: roomName,
          capacity: capacity
        });
      }
    });
    
    // Get matches per team
    const matchesPerTeam = parseInt(document.getElementById('matches').value, 10);

    // Get tournament information for finals from radio button (options are "None", "Single Elimination", "Double Elimination")
    let doFinals = document.querySelector('input[name="do-finals"]:checked').value;

    // check that all teams have at least one member
    if (teamRosters.some(roster => roster.length < 2)) {
      alert('All teams must have at least one member.');
      return;
    }

    // Generate schedule
    const schedule = generateMatchSchedule(teams, rooms, matchesPerTeam);

    // Generate finals info if needed
    let finalsRounds = [];
    if (doFinals != 'None') {
      const finalRounds = calcTournament(teams, rooms, doFinals);
      
      finalsRounds = finalRounds.map((round, roundIdx) => {
        // Generate correct round names: last is "Finals", second-last is "Consolation", rest are "Semi-Final"
        let roundName;
        const totalRounds = finalRounds.length;
        if (roundIdx === totalRounds - 1) {
          roundName = "Finals";
        } else if (roundIdx === totalRounds - 2) {
          roundName = "Consolation";
        } else {
          roundName = "Semi-Final";
        }
        
        // Create room info for this finals round
        const roomInfo = rooms.map(room => {
          const isRoomUsed = round.some(r => r.name === room.name);
          let teamsInRoom = 0;
          
          if (isRoomUsed) {
            // Find the room in the round to get team count
            const roomInRound = round.find(r => r.name === room.name);
            teamsInRoom = roomInRound ? (roomInRound.capacity || 2) : 0;
          }
          
          return {
            name: room.name,
            teams: teamsInRoom
          };
        });
        
        return {
          name: roundName,
          rooms: roomInfo
        };
      });
    }

    console.log('Team Rosters:', teamRosters); // For debugging
    console.log('Rooms:', rooms); // For debugging
    console.log(JSON.stringify(schedule, null, 2)); // For debugging
    console.log('Finals Rounds:', finalsRounds); // For debugging

    // Display schedule as HTML table
    displaySchedule(schedule, rooms.map(r => r.name), finalsRounds);
    // Add CSV download button
    addCSVDownload(schedule, rooms.map(r => r.name), teamRosters, rooms);
  });
// });

function displaySchedule(schedule, rooms, finalsRounds = []) {
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
  
  // Regular rounds
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

  // Finals rounds
  finalsRounds.forEach(finalRound => {
    const row = document.createElement('tr');
    const roundCell = document.createElement('td');
    roundCell.textContent = finalRound.name;
    row.appendChild(roundCell);
    rooms.forEach(room => {
      const cell = document.createElement('td');
      const roomInfo = finalRound.rooms.find(r => r.name === room);
      cell.textContent = (roomInfo && roomInfo.teams > 0) ? `${roomInfo.teams} teams` : '-';
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);

  container.appendChild(table);
}

function addCSVDownload(schedule, rooms, teamRosters, rooms) {
  // Remove old button if exists
  const csvDiv = document.getElementById('csv');
  if (!csvDiv) return;
  csvDiv.innerHTML = '';
  const oldBtn = document.getElementById('download-csv');
  if (oldBtn) oldBtn.remove();

  // Get tournament information from the form
  const eventName = document.getElementById('event-name').value || 'Event';
  const division = document.getElementById('division').value || 'Division';
  const tournament = document.getElementById('tournament-name').value || 'Tournament';
  const doFinals = document.querySelector('input[name="do-finals"]:checked').value;
  const finalsTournament = document.getElementById('finals-tournament-name').value || tournament;
  const matchesPerTeam = parseInt(document.getElementById('matches').value, 10) || 1;

  // Create download button
  const btn = document.createElement('button');
  btn.id = 'download-csv';
  btn.textContent = 'Download CSV Schedule';
  btn.style.marginTop = '1em';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Generate CSV content using genCSVSchedule
    const csvContent = genCSVSchedule(
      teamRosters, 
      rooms,
      eventName, 
      division, 
      tournament, 
      doFinals, 
      finalsTournament, 
      matchesPerTeam, 
      schedule
    );
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tournament-schedule.csv';
    csvDiv.appendChild(a);
    a.click();
    setTimeout(() => {
      csvDiv.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });

  csvDiv.appendChild(btn);
}



// Add remove buttons
document.getElementById('add-team').addEventListener('click', (e) => {
  e.preventDefault();
  const teamsDiv = document.querySelector('.teams');
  const teamSection = document.createElement('div');
  teamSection.className = 'team-section';

  const teamHeader = document.createElement('div');
  teamHeader.className = 'team-header';
  const teamNameInput = document.createElement('input');
  teamNameInput.type = 'text';
  teamNameInput.className = 'team-name';
  teamNameInput.name = 'team-names';
  teamNameInput.placeholder = 'Team Name';
  teamNameInput.required = true;

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.title = 'Remove Team';
  removeBtn.className = 'remove-team-btn';
  removeBtn.addEventListener('click', () => {
    teamSection.remove();
  });

  teamHeader.appendChild(teamNameInput);
  teamHeader.appendChild(removeBtn);

  const teamMembers = document.createElement('div');
  teamMembers.className = 'team-members';
  for (let i = 1; i <= 5; i++) {
    const memberInput = document.createElement('input');
    memberInput.type = 'text';
    memberInput.className = 'team-member';
    memberInput.name = 'team-members';
    memberInput.placeholder = `Team Member ${i}`;
    teamMembers.appendChild(memberInput);
  }

  teamSection.appendChild(teamHeader);
  teamSection.appendChild(teamMembers);
  teamsDiv.appendChild(teamSection);
});



document.getElementById('add-room').addEventListener('click', function(e) {
  e.preventDefault();
  const roomsDiv = document.querySelector('.rooms');
  const roomRow = document.createElement('div');
  roomRow.className = 'room-row';
  roomRow.innerHTML = `
    <div class="room-header">
      <input type="text" class="room" name="rooms" placeholder="Room Name" required="true">
      <button type="button" class="remove-room-btn" title="Remove Room">✕</button>
    </div>
      <div class="room-slots">
      <label class="switch">
        <input type="checkbox" class="room-toggle" name="room-3team">
        <span class="slider"></span>
      </label>
      <span class="toggle-label">3-Team Room</span>
    </div>
  `;
  // Add remove functionality
  roomRow.querySelector('.remove-room-btn').addEventListener('click', function() {
    roomRow.remove();
  });
  roomsDiv.appendChild(roomRow);
});