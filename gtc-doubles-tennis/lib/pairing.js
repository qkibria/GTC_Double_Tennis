// Generates `numRounds` rounds of doubles matches from a list of players.
// Each player object looks like: { id, name, rating } (rating: higher = stronger).

// Splits a sorted-by-rating list of "playing" players into strong/weak pairs.
// `rotation` shifts which weak player is matched with which strong player,
// so partnerships change from round to round instead of repeating.
function strongWeakPairs(playing, rotation) {
  const half = playing.length / 2;
  const strong = playing.slice(0, half);
  const weak = playing.slice(half).reverse(); // weakest first
  const r = weak.length ? rotation % weak.length : 0;
  const weakRotated = weak.slice(r).concat(weak.slice(0, r));
  return strong.map((s, i) => [s, weakRotated[i]]);
}

// Rotates the order of the pairs before grouping them into courts, so who
// plays against whom also varies round to round — not just who partners
// whom.
function rotatePairOrder(pairs, rotation) {
  if (pairs.length < 2) return pairs;
  const r = rotation % pairs.length;
  return pairs.slice(r).concat(pairs.slice(0, r));
}

function pairsToCourts(pairs, startCourtNumber) {
  const courts = [];
  for (let c = 0; c * 2 < pairs.length; c++) {
    const pairA = pairs[c * 2];
    const pairB = pairs[c * 2 + 1];
    if (!pairA || !pairB) continue; // odd pair left over, shouldn't normally happen
    courts.push({
      court: startCourtNumber + c,
      teamA: pairA.map((p) => p.name),
      teamB: pairB.map((p) => p.name),
    });
  }
  return courts;
}

export function generateRounds(selectedPlayers, numRounds = 3) {
  const n = selectedPlayers.length;
  const courtsCount = Math.floor(n / 4);
  if (courtsCount < 1) {
    return { error: "Need at least 4 players (one court) to generate matches." };
  }

  const playersPerRound = courtsCount * 4;
  const sitOutCount = n - playersPerRound;
  const sorted = [...selectedPlayers].sort((a, b) => b.rating - a.rating);

  const rounds = [];

  for (let round = 1; round <= numRounds; round++) {
    // Rotate who sits out each round so it's not always the same people
    let playing = sorted;
    let sittingOut = [];
    if (sitOutCount > 0) {
      const startIdx = ((round - 1) * sitOutCount) % n;
      const sitIndices = new Set();
      for (let k = 0; k < sitOutCount; k++) sitIndices.add((startIdx + k) % n);
      sittingOut = sorted.filter((_, i) => sitIndices.has(i));
      playing = sorted.filter((_, i) => !sitIndices.has(i));
    }

    let courts;

    if (round < numRounds) {
      // Normal round: one strong + one weak per pair, rotating both who
      // partners whom and who plays whom so it varies round to round
      // rather than repeating the same partnerships/opponents.
      const pairs = strongWeakPairs(playing, round - 1);
      const orderedPairs = rotatePairOrder(pairs, round - 1);
      courts = pairsToCourts(orderedPairs, 1);
    } else {
      // Final round: top 4 rated players from this session get one
      // all-strong court together — a "strong round" to finish on.
      const remaining = [...playing]; // already sorted strongest-first
      const top4 = remaining.splice(0, 4);
      const court1 = {
        court: 1,
        teamA: [top4[0].name, top4[3].name], // 1st & 4th vs 2nd & 3rd - keeps it close
        teamB: [top4[1].name, top4[2].name],
      };
      // Use a rotation distinct from the earlier rounds for the remaining
      // courts, so the last round doesn't just repeat round 1's pairing.
      const restPairs = strongWeakPairs(remaining, numRounds);
      const restOrderedPairs = rotatePairOrder(restPairs, numRounds);
      const restCourts = pairsToCourts(restOrderedPairs, 2);
      courts = [court1, ...restCourts];
    }

    rounds.push({
      round,
      courts,
      sittingOut: sittingOut.map((p) => p.name),
    });
  }

  return { rounds, courtsCount, sitOutCount };
}
